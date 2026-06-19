import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded, subscription_status, trial_ends_at")
      .eq("id", data.user.id)
      .maybeSingle();

    const path = window.location.pathname;

    if (profile && !profile.onboarded && path !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }

    // Subscription gate: require active sub OR active trial.
    // past_due gets a 3-day grace period (soft-lock) before access is revoked.
    const status = profile?.subscription_status ?? "free";
    const trialEnd = (profile as { trial_ends_at?: string | null } | null)?.trial_ends_at;
    const trialActive = status === "trialing" && trialEnd && new Date(trialEnd).getTime() > Date.now();

    let pastDueGrace = false;
    if (status === "past_due") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("past_due_since")
        .eq("user_id", data.user.id)
        .maybeSingle();
      const since = (sub as { past_due_since?: string | null } | null)?.past_due_since;
      if (since) {
        pastDueGrace = Date.now() - new Date(since).getTime() < 3 * 86400000;
      } else {
        pastDueGrace = true;
      }
    }

    const hasAccess = status === "active" || trialActive || pastDueGrace;

    if (!hasAccess && path !== "/premium") {
      throw redirect({ to: "/premium" });
    }

    return { user: data.user, hasAccess };
  },
  component: () => <Outlet />,
});
