import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type DeleteResult = { ok: true } | { error: string };

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeleteResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Cancel Stripe subscriptions (sandbox + live) immediately.
    try {
      const { data: subs } = await supabaseAdmin
        .from("subscriptions")
        .select("environment, stripe_subscription_id, stripe_customer_id")
        .eq("user_id", userId);

      for (const s of subs ?? []) {
        const env = (s.environment === "live" ? "live" : "sandbox") as "live" | "sandbox";
        try {
          const stripe = createStripeClient(env);
          if (s.stripe_subscription_id) {
            try {
              await stripe.subscriptions.cancel(s.stripe_subscription_id, {
                invoice_now: false,
                prorate: false,
              });
            } catch (e) {
              console.warn("[deleteAccount] cancel sub failed", env, getStripeErrorMessage(e));
            }
          }
          if (s.stripe_customer_id) {
            // List & cancel any remaining active subs on the customer
            try {
              const list = await stripe.subscriptions.list({
                customer: s.stripe_customer_id,
                status: "all",
                limit: 100,
              });
              for (const sub of list.data) {
                if (["canceled", "incomplete_expired"].includes(sub.status)) continue;
                try {
                  await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
                } catch (e) {
                  console.warn("[deleteAccount] cancel extra sub failed", env, sub.id, getStripeErrorMessage(e));
                }
              }
              // Delete the customer to fully detach
              try {
                await stripe.customers.del(s.stripe_customer_id);
              } catch (e) {
                console.warn("[deleteAccount] delete customer failed", env, getStripeErrorMessage(e));
              }
            } catch (e) {
              console.warn("[deleteAccount] list subs failed", env, getStripeErrorMessage(e));
            }
          }
        } catch (e) {
          console.warn("[deleteAccount] stripe env init failed", env, getStripeErrorMessage(e));
        }
      }
    } catch (e) {
      console.warn("[deleteAccount] subscription lookup failed", e);
    }

    // 2) Best-effort cleanup of storage objects (avatars + hydration photos).
    for (const bucket of ["avatars", "hydration-photos"]) {
      try {
        const { data: files } = await supabaseAdmin.storage.from(bucket).list(userId, { limit: 1000 });
        if (files && files.length > 0) {
          await supabaseAdmin.storage
            .from(bucket)
            .remove(files.map((f) => `${userId}/${f.name}`));
        }
      } catch (e) {
        console.warn("[deleteAccount] storage cleanup failed", bucket, e);
      }
    }

    // 3) Delete app rows (in case FKs are not cascading).
    const tables = [
      "hydration_logs",
      "user_achievements",
      "reminders",
      "streaks",
      "xp",
      "subscriptions",
      "email_unsubscribe_tokens",
      "email_send_log",
      "email_send_state",
      "profiles",
    ] as const;
    for (const t of tables) {
      try {
        // Cast: union of tables breaks the typed eq() signature; runtime is fine.
        await (supabaseAdmin.from(t) as unknown as { delete: () => { eq: (c: string, v: string) => Promise<unknown> } })
          .delete()
          .eq("user_id", userId);
      } catch {
        /* noop: some tables may key on id instead of user_id */
      }
    }
    try {
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
    } catch { /* noop */ }

    // 4) Delete auth user.
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) return { error: error.message };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Delete failed" };
    }

    return { ok: true };
  });
