import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Splash, SplashDefs } from "@/components/h2go/Splash";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

export const Route = createFileRoute("/checkout/return")({
  ssr: false,
  head: () => ({ meta: [{ title: "Subscription confirmed — H2GO" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { t } = useT();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    // Webhook may take a couple seconds; invalidate dashboard queries so the gate re-evaluates
    qc.invalidateQueries();
  }, [qc]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#0D9488]">
      <SplashDefs />
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center gap-3">
        <Splash mood="celebrating" size={90} />
        <h1 className="font-display text-2xl font-bold">
          {t("checkout.welcome")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("checkout.welcomeBody")}
        </p>
        <Button
          onClick={() => navigate({ to: "/home" })}
          className="mt-2 w-full rounded-2xl h-12 bg-gradient-to-r from-primary to-secondary"
        >
          {t("ob.finish")}
        </Button>
      </div>
    </div>
  );
}
