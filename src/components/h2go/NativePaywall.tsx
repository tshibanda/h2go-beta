import { useEffect, useState } from "react";
import { Crown, Check, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/i18n";
import {
  restorePurchases,
  configureRevenueCat,
  presentPaywall,
  hasActiveEntitlement,
  isNativePayments,
} from "@/lib/revenuecat";
import { supabase } from "@/integrations/supabase/client";
import { syncRevenueCatEntitlement } from "@/lib/revenuecat-sync.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";

export function NativePaywall({ onSuccess, userId }: { onSuccess?: () => void; userId?: string }) {
  const { t, locale } = useT();
  const qc = useQueryClient();
  const sync = useServerFn(syncRevenueCatEntitlement);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [nativePaywallReady, setNativePaywallReady] = useState(false);
  const [openingNativePaywall, setOpeningNativePaywall] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
        p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
      });

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        if (!isNativePayments()) {
          if (!cancelled) setErrorMsg(locale === "fr" ? "Achats natifs disponibles uniquement sur l'app iOS/Android." : "Native purchases only available on iOS/Android app.");
          return;
        }
        // Make sure the SDK is configured before presenting RevenueCat UI.
        const resolvedUserId = userId ?? (await supabase.auth.getUser()).data.user?.id;
        if (resolvedUserId) {
          await withTimeout(configureRevenueCat(resolvedUserId, locale === "fr" ? "fr-FR" : "en-US"), 12000, "configure");
        }
        if (!cancelled) setNativePaywallReady(true);

        // Prefer the RevenueCat-generated native paywall on TestFlight/App Store.
        // It owns the offer rendering and StoreKit purchase flow, avoiding the
        // Apple SubscriptionStoreView copy and any local fallback offer labels.
        const result = await openRevenueCatPaywall();
        if (cancelled) return;
        if (result !== "opened") {
          setErrorMsg(locale === "fr"
            ? "Impossible d'ouvrir le paywall RevenueCat. Réessayez."
            : "Unable to open the RevenueCat paywall. Please retry.");
        }
      } catch (e) {
        console.warn("[paywall] init failed", e);
        if (!cancelled) {
          const message = String(e instanceof Error ? e.message : e);
          const missingKey = message.toLowerCase().includes("missing revenuecat");
          setErrorMsg(missingKey
            ? locale === "fr"
              ? "Configuration RevenueCat incomplète : ajoutez la clé publique Apple du SDK dans les variables d'environnement."
              : "RevenueCat setup is incomplete: add the Apple public SDK key to the environment variables."
            : locale === "fr"
              ? `Impossible de charger les offres RevenueCat/App Store. Réessayez.\n[DEBUG] ${message}`
              : `Failed to load RevenueCat/App Store offers. Please retry.\n[DEBUG] ${message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, locale, userId]);

  async function openRevenueCatPaywall(): Promise<"opened" | "fallback"> {
    setOpeningNativePaywall(true);
    try {
      // Use the RevenueCat-hosted paywall (configured in the RC dashboard).
      // The native Apple SubscriptionStoreView was removed because it reads
      // its copy from App Store Connect and ignored the RC paywall config.
      const result = await presentPaywall();
      if (result === "ERROR" || result === "NOT_PRESENTED") return "fallback";
      const active = await hasActiveEntitlement().catch(() => false);
      if (active || result === "PURCHASED" || result === "RESTORED") {
        await sync({ data: { active: true, store: "app_store" } }).catch(() => null);
        toast.success(locale === "fr" ? "Bienvenue dans H2GO Premium !" : "Welcome to H2GO Premium!");
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        onSuccess?.();
      }
      return "opened";
    } finally {
      setOpeningNativePaywall(false);
    }
  }

  async function restore() {
    setRestoring(true);
    try {
      const r = await restorePurchases();
      if (r.active) {
        await sync({ data: { active: true, store: "app_store" } }).catch(() => null);
        toast.success(locale === "fr" ? "Abonnement restauré" : "Purchases restored");
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        onSuccess?.();
      } else {
        toast.info(locale === "fr" ? "Aucun abonnement à restaurer" : "No purchases to restore");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRestoring(false);
    }
  }

  const features = [t("pay.f1"), t("pay.f2"), t("pay.f3"), t("pay.f4"), t("pay.f5"), t("pay.f6")];

  return (
    <div className="flex flex-col gap-4 pb-6 animate-fade-in">
      <div className="mx-4 rounded-3xl p-6 bg-gradient-to-br from-[#1E3A8A] via-primary to-secondary text-white text-center">
        <Crown size={40} color="#FDE68A" className="mx-auto mb-2" />
        <h1 className="font-display text-3xl font-bold">{t("pay.title")}</h1>
        <p className="text-sm text-white/85 mt-1">
          {locale === "fr" ? "MEILLEURE OFFRE" : "BEST OFFER"}
        </p>
      </div>

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

      {loading ? (
        <div className="mx-4 flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : errorMsg ? (
        <div className="mx-4 rounded-2xl p-4 bg-card border border-border text-center">
          <p className="text-sm text-muted-foreground mb-3">{errorMsg}</p>
          <Button
            onClick={async () => {
              if (nativePaywallReady) {
                const result = await openRevenueCatPaywall();
                if (result === "opened") return;
              }
              setLoadAttempt((n) => n + 1);
            }}
            disabled={openingNativePaywall}
            className="rounded-xl"
          >
            {openingNativePaywall ? (locale === "fr" ? "Ouverture…" : "Opening…") : locale === "fr" ? "Ouvrir les offres" : "Open offers"}
          </Button>
        </div>
      ) : nativePaywallReady ? (
        <div className="mx-4 rounded-2xl p-4 bg-card border border-border text-center">
          <Button onClick={() => openRevenueCatPaywall()} disabled={openingNativePaywall} className="rounded-xl w-full">
            {openingNativePaywall ? (locale === "fr" ? "Ouverture…" : "Opening…") : locale === "fr" ? "Voir les offres" : "View offers"}
          </Button>
        </div>
      ) : null}

      <button
        onClick={restore}
        disabled={restoring}
        className="mx-4 flex items-center justify-center gap-2 text-xs text-muted-foreground py-2"
      >
        <RotateCcw size={14} />
        {restoring
          ? locale === "fr"
            ? "Restauration…"
            : "Restoring…"
          : locale === "fr"
            ? "Restaurer mes achats"
            : "Restore purchases"}
      </button>

      <p className="mx-4 text-[11px] text-muted-foreground text-center leading-relaxed">
        {locale === "fr"
          ? "Abonnement auto-renouvelable. Le paiement est prélevé sur votre compte Apple à la confirmation. Renouvellement automatique sauf annulation au moins 24 h avant la fin de la période en cours. Gérez votre abonnement dans les Réglages de l'App Store."
          : "Auto-renewing subscription. Payment charged to your Apple ID at confirmation. Renews automatically unless cancelled at least 24 h before the current period ends. Manage in App Store settings."}
        {" "}
        <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer" className="underline">
          EULA
        </a>{" · "}
        <a href="https://h2go-app.com/privacy" target="_blank" rel="noreferrer" className="underline">
          {locale === "fr" ? "Confidentialité" : "Privacy"}
        </a>
      </p>
    </div>
  );
}