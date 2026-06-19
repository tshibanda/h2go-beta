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

    // Subscription gate: require active sub OR active trial
    const status = profile?.subscription_status ?? "free";
    const trialEnd = (profile as { trial_ends_at?: string | null } | null)?.trial_ends_at;
    const trialActive = status === "trialing" && trialEnd && new Date(trialEnd).getTime() > Date.now();
    const hasAccess = status === "active" || trialActive;

    if (!hasAccess && path !== "/premium") {
      throw redirect({ to: "/premium" });
    }

    return { user: data.user, hasAccess };
  },
  component: () => <Outlet />,
});
