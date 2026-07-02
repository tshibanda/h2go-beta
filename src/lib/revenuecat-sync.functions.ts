/**
 * Server function to sync the user's RevenueCat entitlement into the
 * public.subscriptions table. Called from the client after a successful
 * native purchase (belt-and-suspenders alongside the webhook).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SyncInput = {
  active: boolean;
  productIdentifier?: string | null;
  expiresAtISO?: string | null;
  originalTransactionId?: string | null;
  store?: "app_store" | "play_store" | null;
};

export const syncRevenueCatEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SyncInput) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const userId = context.userId;

    const payload: Record<string, unknown> = {
      user_id: userId,
      provider: "revenuecat",
      status: data.active ? "active" : "canceled",
      current_period_end: data.expiresAtISO ?? null,
      product_identifier: data.productIdentifier ?? null,
      original_transaction_id: data.originalTransactionId ?? null,
      store: data.store ?? null,
      revenuecat_user_id: userId,
      entitlement: "premium",
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("subscriptions")
      .upsert(payload, { onConflict: "user_id" });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
