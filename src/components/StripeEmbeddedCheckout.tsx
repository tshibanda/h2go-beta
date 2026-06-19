import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

export function StripeEmbeddedCheckoutInline({
  priceId,
  returnUrl,
}: {
  priceId: string;
  returnUrl?: string;
}) {
  const create = useServerFn(createCheckoutSession);
  const fetchClientSecret = async (): Promise<string> => {
    const result = await create({
      data: {
        priceId,
        returnUrl: returnUrl || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret");
    return result.clientSecret;
  };
  return (
    <div id="checkout" className="bg-white rounded-2xl overflow-hidden">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
