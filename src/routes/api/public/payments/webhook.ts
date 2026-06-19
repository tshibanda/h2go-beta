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

  const supabaseAdmin = await getAdmin();
  await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceLookup(item),
      status: subscription.status as "active" | "canceled" | "free" | "past_due" | "trialing",
      current_period_start: isoFromUnix(periodStart),
      current_period_end: isoFromUnix(periodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function handleSubscriptionDeleted(subscription: StripeSubscription, env: StripeEnv) {
  const supabaseAdmin = await getAdmin();
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
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
