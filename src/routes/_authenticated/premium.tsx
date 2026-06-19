import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crown, Check, LogOut } from "lucide-react";
import { MobileShell } from "@/components/h2go/MobileShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/i18n";
import { getDashboard } from "@/lib/h2go.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/premium")({
  head: () => ({ meta: [{ title: "Premium — H2GO" }] }),
  component: PremiumPage,
});

function PremiumPage() {
  const { t } = useT();
  const { hasAccess } = Route.useRouteContext();
  const navigate = useNavigate();
  const fetchDash = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });

  const trialEnd = (data?.profile as { trial_ends_at?: string | null } | null)?.trial_ends_at;
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000))
    : 0;
  const status = data?.profile?.subscription_status ?? "free";
  const trialActive = status === "trialing" && daysLeft > 0;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const features = [t("pay.f1"), t("pay.f2"), t("pay.f3"), t("pay.f4"), t("pay.f5"), t("pay.f6")];

  const content = (
    <div className="flex flex-col gap-4 pb-6">
      <div className="px-5 pt-4 flex items-center justify-between">
        {hasAccess ? (
          <Link to="/profile" className="text-muted-foreground text-sm">{t("common.back")}</Link>
        ) : (
          <span className="text-[11px] uppercase tracking-wider text-destructive font-bold">
            🔒 {t("pay.locked.title")}
          </span>
        )}
        {!hasAccess && (
          <button onClick={signOut} className="flex items-center gap-1 text-xs text-muted-foreground">
            <LogOut size={14} /> {t("pay.signOut")}
          </button>
        )}
      </div>

      <div className="mx-4 rounded-3xl p-6 bg-gradient-to-br from-[#1E3A8A] via-primary to-secondary text-white text-center">
        <Crown size={40} color="#FDE68A" className="mx-auto mb-2" />
        <h1 className="font-display text-3xl font-bold">{t("pay.title")}</h1>
        <p className="text-sm text-white/85 mt-1">
          {trialActive ? t("pay.trialActive", { days: daysLeft }) : t("pay.trialNote")}
        </p>
      </div>

      {!hasAccess && (
        <p className="mx-4 text-sm text-muted-foreground text-center">{t("pay.locked.body")}</p>
      )}

      <div className="mx-4 rounded-2xl p-4 bg-card shadow">
        <p className="font-display text-sm font-semibold mb-2">{t("pay.featuresHeader")}</p>
        <ul className="flex flex-col gap-3">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="text-emerald-600" size={18} />
              <span className="text-sm">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-4 grid grid-cols-2 gap-3">
        <PlanCard title={t("pay.monthly")} price="€4.99" subtitle={t("pay.perMonth")} cta={t("pay.start")} />
        <PlanCard title={t("pay.yearly")} price="€39.99" subtitle={t("pay.perYear")} cta={t("pay.start")} highlight />
      </div>

      <p className="mx-4 text-[11px] text-muted-foreground text-center">{t("pay.legal")}</p>
    </div>
  );

  // When locked, render WITHOUT bottom nav so the user can't escape.
  if (!hasAccess) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488] flex items-center justify-center sm:p-4">
        <div className="relative flex flex-col w-full sm:w-[390px] sm:h-[844px] min-h-screen sm:min-h-0 sm:rounded-[44px] bg-background overflow-hidden shadow-2xl">
          <div className="flex-1 overflow-y-auto no-sb">{content}</div>
        </div>
      </div>
    );
  }

  return <MobileShell>{content}</MobileShell>;
}

function PlanCard({ title, price, subtitle, cta, highlight }: { title: string; price: string; subtitle: string; cta: string; highlight?: boolean }) {
  function start() {
    toast.info("Stripe checkout will be enabled once payments setup completes.");
  }
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-2 ${highlight ? "bg-gradient-to-br from-primary to-secondary text-white" : "bg-card border border-border"}`}>
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="font-display text-2xl font-bold">{price}</p>
      <p className={`text-[11px] ${highlight ? "text-white/80" : "text-muted-foreground"}`}>{subtitle}</p>
      <Button onClick={start} className={`mt-2 rounded-xl ${highlight ? "bg-white text-primary hover:bg-white/90" : ""}`}>{cta}</Button>
    </div>
  );
}
