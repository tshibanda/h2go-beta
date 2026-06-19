import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/recreate-h2go-live")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const stripe = createStripeClient("live");

          // 1. Find all existing H2GO products (active + inactive)
          const all = await stripe.products.list({ limit: 100 });
          const h2go = all.data.filter((p) => p.name?.toLowerCase().includes("h2go"));

          const archived: Array<{ kind: string; id: string }> = [];

          // 2. Archive all prices for those products, then archive the products
          for (const p of h2go) {
            const prices = await stripe.prices.list({ product: p.id, limit: 100 });
            for (const pr of prices.data) {
              if (pr.active) {
                await stripe.prices.update(pr.id, { active: false });
              }
              archived.push({ kind: "price", id: pr.id });
            }
            if (p.active) {
              await stripe.products.update(p.id, { active: false });
            }
            archived.push({ kind: "product", id: p.id });
          }

          // 3. Create a fresh product
          const product = await stripe.products.create({
            name: "H2GO Premium",
            description: "Premium hydration coaching subscription",
            tax_code: "txcd_10103001",
            metadata: { lovable_external_id: "h2go_premium" },
          });

          // 4. Create fresh prices, transferring lookup_keys from the archived ones
          const monthly = await stripe.prices.create({
            product: product.id,
            currency: "eur",
            unit_amount: 499,
            recurring: { interval: "month" },
            lookup_key: "h2go_monthly",
            transfer_lookup_key: true,
            nickname: "H2GO Premium monthly",
            metadata: { lovable_external_id: "h2go_monthly" },
          });

          const yearly = await stripe.prices.create({
            product: product.id,
            currency: "eur",
            unit_amount: 3999,
            recurring: { interval: "year" },
            lookup_key: "h2go_yearly",
            transfer_lookup_key: true,
            nickname: "H2GO Premium yearly",
            metadata: { lovable_external_id: "h2go_yearly" },
          });

          return new Response(
            JSON.stringify(
              {
                ok: true,
                archived,
                created: {
                  product: { id: product.id, name: product.name, active: product.active },
                  monthly: { id: monthly.id, lookup_key: monthly.lookup_key, active: monthly.active },
                  yearly: { id: yearly.id, lookup_key: yearly.lookup_key, active: yearly.active },
                },
              },
              null,
              2,
            ),
            { headers: { "content-type": "application/json" } },
          );
        } catch (error) {
          return new Response(JSON.stringify({ ok: false, error: getStripeErrorMessage(error) }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
