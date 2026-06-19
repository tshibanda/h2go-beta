import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n";

export function PastDueBanner() {
  const { t } = useT();
  const [show, setShow] = useState(false);
  const [daysLeft, setDaysLeft] = useState(3);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, past_due_since")
        .eq("user_id", u.user.id)
        .maybeSingle();
      const s = sub as { status?: string; past_due_since?: string | null } | null;
      if (cancelled || s?.status !== "past_due") return;
      const since = s.past_due_since ? new Date(s.past_due_since).getTime() : Date.now();
      const days = Math.max(0, 3 - Math.floor((Date.now() - since) / 86400000));
      setDaysLeft(days);
      setShow(true);
      // One-shot toast per session
      if (!sessionStorage.getItem("h2go.pastdue.notified")) {
        toast.error(t("billing.pastDue.toast"), {
          description: t("billing.pastDue.toastBody", { days }),
          duration: 8000,
        });
        sessionStorage.setItem("h2go.pastdue.notified", "1");
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  if (!show) return null;
  return (
    <Link
      to="/premium"
      className="flex items-start gap-2 px-4 py-2.5 bg-destructive/10 border-b border-destructive/30 text-destructive"
    >
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
      <div className="text-[11px] leading-tight">
        <p className="font-semibold">{t("billing.pastDue.title")}</p>
        <p className="opacity-90">{t("billing.pastDue.body", { days: daysLeft })}</p>
      </div>
    </Link>
  );
}
