/**
 * RevenueCat webhook endpoint.
 * Configure in RC dashboard → Integrations → Webhooks:
 *   URL:    https://project--2d165fb1-656c-4d32-836b-5c5b93a392e5.lovable.app/api/public/revenuecat/webhook
 *          (or your custom domain equivalent)
 *   Header: Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (!_admin) {
    _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _admin;
}

type RCEvent = {
  event: {
    type: string;
    app_user_id: string;
    original_app_user_id?: string;
    product_id?: string;
    original_transaction_id?: string;
    store?: string; // APP_STORE | PLAY_STORE | STRIPE | ...
    expiration_at_ms?: number | null;
    purchased_at_ms?: number | null;
    environment?: "SANDBOX" | "PRODUCTION";
    entitlement_ids?: string[] | null;
  };
  api_version: string;
};

const ACTIVATING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);
const DEACTIVATING = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "SUBSCRIPTION_PAUSED",
]);

function storeLabel(s?: string): "app_store" | "play_store" | null {
  if (s === "APP_STORE") return "app_store";
  if (s === "PLAY_STORE") return "play_store";
  return null;
}

async function handleEvent(evt: RCEvent["event"]) {
  const userId = evt.app_user_id;
  if (!userId || userId.startsWith("$RCAnonymousID")) {
    console.log("[rc-webhook] skipping anonymous user", userId);
    return;
  }

  let status: string | null = null;
  if (ACTIVATING.has(evt.type)) status = "active";
  else if (DEACTIVATING.has(evt.type)) status = "canceled";
  else if (evt.type === "BILLING_ISSUE") status = "past_due";

  if (!status) {
    console.log("[rc-webhook] unhandled event type", evt.type);
    return;
  }

  const expiresAt = evt.expiration_at_ms ? new Date(evt.expiration_at_ms).toISOString() : null;
  const startsAt = evt.purchased_at_ms ? new Date(evt.purchased_at_ms).toISOString() : null;

  const payload = {
    user_id: userId,
    provider: "revenuecat" as const,
    status,
    current_period_start: startsAt,
    current_period_end: expiresAt,
    product_identifier: evt.product_id ?? null,
    original_transaction_id: evt.original_transaction_id ?? null,
    store: storeLabel(evt.store),
    revenuecat_user_id: userId,
    entitlement: "premium",
    environment: evt.environment === "PRODUCTION" ? "live" : "sandbox",
    updated_at: new Date().toISOString(),
  };

  const { error } = await (admin() as any)
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });
  if (error) console.error("[rc-webhook] upsert failed", error);
}

export const Route = createFileRoute("/api/public/revenuecat/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[rc-webhook] REVENUECAT_WEBHOOK_SECRET not configured");
          return new Response("Not configured", { status: 500 });
        }
        const auth = request.headers.get("authorization") ?? "";
        const expected = `Bearer ${secret}`;
        if (auth.length !== expected.length || auth !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const body = (await request.json()) as RCEvent;
          if (!body?.event?.type) return new Response("Bad payload", { status: 400 });
          await handleEvent(body.event);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[rc-webhook] error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
