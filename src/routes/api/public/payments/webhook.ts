import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

type StripeSubItem = {
  current_period_start?: number;
  current_period_end?: number;
  price?: {
    id: string;
    lookup_key?: string | null;
    product?: string;
    metadata?: { lovable_external_id?: string };
  };
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_start?: number;
  current_period_end?: number;
  metadata?: { userId?: string };
  items?: { data: StripeSubItem[] };
};

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function priceLookup(item?: StripeSubItem): string | null {
  return item?.price?.lookup_key
    ?? item?.price?.metadata?.lovable_external_id
    ?? item?.price?.id
    ?? null;
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Grant one-time welcome rewards on first paid activation:
 * - +500 XP boost
 * - +10 tree_boost growth points
 * - log a welcome-email TODO (no transactional email infra yet)
 */
async function grantWelcomeReward(
  admin: Awaited<ReturnType<typeof getAdmin>>,
  userId: string,
) {
  // XP bonus
  const { data: xp } = await admin
    .from("xp")
    .select("total_xp")
    .eq("user_id", userId)
    .maybeSingle();
  const currentXp = (xp as { total_xp?: number } | null)?.total_xp ?? 0;
  await admin
    .from("xp")
    .update({ total_xp: currentXp + 500 })
    .eq("user_id", userId);

  // Tree boost
  const { data: profile } = await admin
    .from("profiles")
    .select("tree_boost")
    .eq("id", userId)
    .maybeSingle();
  const currentBoost = (profile as { tree_boost?: number } | null)?.tree_boost ?? 0;
  await admin
    .from("profiles")
    .update({ tree_boost: currentBoost + 10 })
    .eq("id", userId);

  // TODO: send welcome email via transactional provider
  console.log("[webhook] welcome reward granted", { userId, xpAdded: 500, treeBoostAdded: 10 });
}

async function handleSubscription(subscription: StripeSubscription, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("[webhook] No userId in subscription.metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const productId = typeof item?.price?.product === "string" ? item.price.product : null;
  const status = subscription.status;

  const admin = await getAdmin();

  // Read existing row to detect transitions
  const { data: existing } = await admin
    .from("subscriptions")
    .select("status, reward_granted, past_due_since")
    .eq("user_id", userId)
    .maybeSingle();

  const prevStatus = (existing as { status?: string } | null)?.status;
  const alreadyRewarded = (existing as { reward_granted?: boolean } | null)?.reward_granted ?? false;
  const prevPastDueSince = (existing as { past_due_since?: string | null } | null)?.past_due_since ?? null;

  // Past-due tracking for 3-day soft-lock
  let pastDueSince: string | null = prevPastDueSince;
  if (status === "past_due" && !prevPastDueSince) {
    pastDueSince = new Date().toISOString();
  } else if (status !== "past_due") {
    pastDueSince = null;
  }

  // First-time paid activation → grant welcome reward
  const becameActive = status === "active" && prevStatus !== "active" && !alreadyRewarded;

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceLookup(item),
      status: status as "active" | "canceled" | "free" | "past_due" | "trialing",
      current_period_start: isoFromUnix(periodStart),
      current_period_end: isoFromUnix(periodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      environment: env,
      past_due_since: pastDueSince,
      reward_granted: alreadyRewarded || becameActive,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (becameActive) {
    await grantWelcomeReward(admin, userId);
  }
}

async function handleSubscriptionDeleted(subscription: StripeSubscription, env: StripeEnv) {
  const admin = await getAdmin();
  await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      past_due_since: null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          const obj = event.data.object as StripeSubscription;
          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await handleSubscription(obj, env);
              break;
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(obj, env);
              break;
            default:
              console.log("[webhook] unhandled", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
