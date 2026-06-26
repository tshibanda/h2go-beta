import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


/**
 * Sends the H2GO welcome email to the current user the first time it's called.
 * Idempotent: relies on profiles.welcome_email_sent_at to avoid duplicates.
 */
export const sendWelcomeEmailIfNeeded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name, welcome_email_sent_at")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || profile.welcome_email_sent_at) {
      return { sent: false, reason: "already_sent_or_missing" as const };
    }
    if (!profile.email) {
      return { sent: false, reason: "no_email" as const };
    }

    // Mark as sent FIRST to prevent duplicates on concurrent calls.
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcome_email_sent_at", null);
    if (updateErr) {
      return { sent: false, reason: "update_failed" as const };
    }

    const origin =
      process.env.SITE_URL ||
      process.env.PUBLIC_SITE_URL ||
      "https://h2go-app.com";

    try {
      const incomingAuth = getRequest()?.headers.get("authorization") ?? "";
      const origin2 = origin;
      const res = await fetch(`${origin2}/lovable/email/transactional/send`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: incomingAuth,
        },

        body: JSON.stringify({
          templateName: "welcome",
          recipientEmail: profile.email,
          idempotencyKey: `welcome-${userId}`,
          templateData: { name: profile.name ?? null },
        }),
      });
      if (!res.ok) {
        // Roll back the flag so a later retry can succeed.
        await supabase
          .from("profiles")
          .update({ welcome_email_sent_at: null })
          .eq("id", userId);
        const body = await res.text().catch(() => "");
        return { sent: false, reason: "send_failed" as const, status: res.status, body };
      }
      return { sent: true };
    } catch (err) {
      await supabase
        .from("profiles")
        .update({ welcome_email_sent_at: null })
        .eq("id", userId);
      return { sent: false, reason: "send_exception" as const, error: String(err) };
    }
  });
