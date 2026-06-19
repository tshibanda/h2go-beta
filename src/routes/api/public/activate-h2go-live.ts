import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/activate-h2go-live")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const stripe = createStripeClient("live");
          const all = await stripe.products.list({ limit: 100 });
          const h2go = all.data.filter((p) => p.name?.toLowerCase().includes("h2go"));
          const productsActivated: Array<{ id: string; name: string; active: boolean }> = [];
          for (const p of h2go) {
            if (!p.active) {
              const u = await stripe.products.update(p.id, { active: true });
              productsActivated.push({ id: u.id, name: u.name, active: u.active });
            } else {
              productsActivated.push({ id: p.id, name: p.name, active: p.active });
            }
          }
          const pricesActivated: Array<{ id: string; product: string; active: boolean; lookup_key: string | null }> = [];
          for (const p of h2go) {
            const prices = await stripe.prices.list({ product: p.id, limit: 100 });
            for (const pr of prices.data) {
              if (!pr.active) {
                const u = await stripe.prices.update(pr.id, { active: true });
                pricesActivated.push({ id: u.id, product: p.id, active: u.active, lookup_key: u.lookup_key });
              } else {
                pricesActivated.push({ id: pr.id, product: p.id, active: pr.active, lookup_key: pr.lookup_key });
              }
            }
          }
          return new Response(JSON.stringify({ ok: true, productsActivated, pricesActivated }, null, 2), {
            headers: { "content-type": "application/json" },
          });
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
