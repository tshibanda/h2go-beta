import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };

const H2GO_PRODUCT = {
  id: "h2go_premium",
  name: "H2GO Premium",
  description: "Premium hydration coaching subscription",
  taxCode: "txcd_10103001",
} as const;

const H2GO_PRICES = {
  h2go_monthly: { amount: 499, interval: "month", nickname: "H2GO Premium monthly" },
  h2go_yearly: { amount: 3999, interval: "year", nickname: "H2GO Premium yearly" },
} as const;

type StripeClient = ReturnType<typeof createStripeClient>;
type H2goPriceId = keyof typeof H2GO_PRICES;

function isH2goPriceId(priceId: string): priceId is H2goPriceId {
  return priceId in H2GO_PRICES;
}

async function resolveH2goProduct(stripe: StripeClient) {
  try {
    const found = await stripe.products.search({
      query: `metadata['lovable_external_id']:'${H2GO_PRODUCT.id}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0];
  } catch {
    const listed = await stripe.products.list({ active: true, limit: 100 });
    const existing = listed.data.find(
      (product) =>
        product.metadata?.lovable_external_id === H2GO_PRODUCT.id ||
        product.name === H2GO_PRODUCT.name,
    );
    if (existing) return existing;
  }

  return stripe.products.create({
    name: H2GO_PRODUCT.name,
    description: H2GO_PRODUCT.description,
    tax_code: H2GO_PRODUCT.taxCode,
    metadata: { lovable_external_id: H2GO_PRODUCT.id },
  });
}

async function resolveH2goPrice(stripe: StripeClient, priceId: string) {
  const prices = await stripe.prices.list({ lookup_keys: [priceId], active: true, limit: 1 });
  if (prices.data.length) return prices.data[0];
  if (!isH2goPriceId(priceId)) throw new Error("Price not found");

  const plan = H2GO_PRICES[priceId];
  const product = await resolveH2goProduct(stripe);

  try {
    return await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: plan.amount,
      recurring: { interval: plan.interval },
      lookup_key: priceId,
      transfer_lookup_key: true,
      nickname: plan.nickname,
      metadata: { lovable_external_id: priceId },
    });
  } catch (error) {
    const retry = await stripe.prices.list({ lookup_keys: [priceId], active: true, limit: 1 });
    if (retry.data.length) return retry.data[0];
    throw error;
  }
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    if (data.environment !== "sandbox" && data.environment !== "live") {
      throw new Error("Invalid payment environment");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;
      const stripe = createStripeClient(data.environment);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email;

      // Resolve or create Stripe customer with userId metadata
      let customerId: string | undefined;
      if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error("Invalid userId");
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      if (found.data.length) {
        customerId = found.data[0].id;
      } else if (email) {
        const byEmail = await stripe.customers.list({ email, limit: 1 });
        if (byEmail.data.length) {
          customerId = byEmail.data[0].id;
          await stripe.customers.update(customerId, {
            metadata: { ...byEmail.data[0].metadata, userId },
          });
        }
      }
      if (!customerId) {
        const created = await stripe.customers.create({
          ...(email && { email }),
          metadata: { userId },
        });
        customerId = created.id;
      }

      // Resolve price by lookup_key; self-heal live/test if the catalog was not synced yet.
      const stripePrice = await resolveH2goPrice(stripe, data.priceId);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId },
        subscription_data: {
          trial_period_days: 7,
          metadata: { userId },
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type PortalResult = { url: string } | { error: string };

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => {
    if (data.environment !== "sandbox" && data.environment !== "live") {
      throw new Error("Invalid payment environment");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<PortalResult> => {
    try {
      const { supabase, userId } = context;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const customerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id;
      if (!customerId) return { error: "No subscription found" };

      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
