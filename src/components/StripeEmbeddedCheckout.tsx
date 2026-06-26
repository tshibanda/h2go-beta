import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";
import { LoadingScreen } from "@/components/h2go/LoadingScreen";

export function StripeEmbeddedCheckoutInline({
  priceId,
  returnUrl,
}: {
  priceId: string;
  returnUrl?: string;
}) {
  const create = useServerFn(createCheckoutSession);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setClientSecret(null);
    (async () => {
      try {
        const result = await create({
          data: {
            priceId,
            returnUrl:
              returnUrl ||
              `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
            environment: getStripeEnvironment(),
          },
        });
        if (cancelled) return;
        if ("error" in result) {
          setError(result.error);
          return;
        }
        if (!result.clientSecret) {
          setError("Stripe did not return a client secret.");
          return;
        }
        setClientSecret(result.clientSecret);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Checkout could not start.";
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [priceId, returnUrl, create]);

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center">
        <p className="font-display text-base font-semibold text-destructive mb-2">
          Le paiement n'a pas pu démarrer
        </p>
        <p className="text-sm text-muted-foreground break-words">{error}</p>
      </div>
    );
  }

  if (!clientSecret) {
    return <LoadingScreen subtitle="Préparation du paiement sécurisé…" />;
  }

  return (
    <div id="checkout" className="bg-white rounded-2xl overflow-hidden">
      <EmbeddedCheckoutProvider
        stripe={getStripe()}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
