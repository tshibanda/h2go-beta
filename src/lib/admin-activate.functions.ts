import { createServerFn } from "@tanstack/react-start";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

export const activateLiveH2GO = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const stripe = createStripeClient("live");
    const products = await stripe.products.list({ limit: 100, active: false });
    const results: Array<{ id: string; name: string; active: boolean }> = [];
    for (const p of products.data) {
      if (p.name?.toLowerCase().includes("h2go")) {
        const updated = await stripe.products.update(p.id, { active: true });
        results.push({ id: updated.id, name: updated.name, active: updated.active });
      }
    }
    // Also activate all prices for matching products
    const allProducts = await stripe.products.list({ limit: 100 });
    const h2goIds = allProducts.data.filter(p => p.name?.toLowerCase().includes("h2go")).map(p => p.id);
    const priceResults: Array<{ id: string; product: string; active: boolean }> = [];
    for (const pid of h2goIds) {
      const prices = await stripe.prices.list({ product: pid, limit: 100, active: false });
      for (const pr of prices.data) {
        const upd = await stripe.prices.update(pr.id, { active: true });
        priceResults.push({ id: upd.id, product: pid, active: upd.active });
      }
    }
    return { ok: true, productsActivated: results, pricesActivated: priceResults, h2goProductIds: h2goIds };
  } catch (error) {
    return { ok: false, error: getStripeErrorMessage(error) };
  }
});
