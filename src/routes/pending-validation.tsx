import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/i18n";

const search = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/pending-validation")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Confirm your email — H2GO" },
      { name: "description", content: "Confirm your H2GO account email to continue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { email } = useSearch({ from: "/pending-validation" });
  const [busy, setBusy] = useState(false);

  async function resend() {
    if (!email) {
      toast.error(t("pv.resendFail"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/home` },
    });
    setBusy(false);
    if (error) toast.error(t("pv.resendFail"));
    else toast.success(t("pv.resent"));
  }

  async function checkAgain() {
    await supabase.auth.signOut();
    const { purgeLocalUserData } = await import("@/lib/session-cleanup");
    await purgeLocalUserData();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488]">
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MailCheck className="text-primary" size={32} />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">{t("pv.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {email ? t("pv.body", { email }) : t("pv.bodyNoEmail")}
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={resend} disabled={busy || !email} className="w-full">
            {t("pv.resend")}
          </Button>
          <Button variant="outline" onClick={checkAgain} className="w-full">
            {t("pv.checkAgain")}
          </Button>
          <Button variant="ghost" onClick={checkAgain} className="w-full text-muted-foreground">
            {t("pv.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
