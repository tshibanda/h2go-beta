/**
 * RevenueCat SDK wrapper for native iOS/Android.
 * On web this is a no-op — Stripe is used instead (see payment-router.ts).
 */
import { Capacitor } from "@capacitor/core";

// Product identifiers as configured in App Store Connect / Play Console.
export const PRODUCT_MONTHLY = "com.h2go.app.monthly";
export const PRODUCT_YEARLY = "com.h2go.app.yearly";
export const ENTITLEMENT_ID = "H2GO Premium";
const ENTITLEMENT_ALIASES = [ENTITLEMENT_ID, "premium", "h2go_premium", "h2go-premium"];

export function isNativePayments(): boolean {
  return Capacitor.isNativePlatform();
}

let configured = false;
let currentAppUserId: string | null = null;

async function loadRevenueCat() {
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod;
}

async function loadPurchases() {
  const mod = await loadRevenueCat();
  return mod.Purchases;
}

async function apiKeyForPlatform(): Promise<string | null> {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    return (
      import.meta.env.VITE_REVENUECAT_APPLE_KEY ??
      import.meta.env.VITE_REVENUECAT_IOS_KEY ??
      import.meta.env.VITE_REVENUECAT_PUBLIC_APPLE_KEY ??
      null
    );
  }
  if (platform === "android") {
    return (
      import.meta.env.VITE_REVENUECAT_GOOGLE_KEY ??
      import.meta.env.VITE_REVENUECAT_ANDROID_KEY ??
      import.meta.env.VITE_REVENUECAT_PUBLIC_GOOGLE_KEY ??
      null
    );
  }
  return null;
}

export async function getRevenueCatConfigStatus(): Promise<{ configured: boolean; missingKey: boolean; platform: string }> {
  const platform = Capacitor.getPlatform();
  if (!isNativePayments()) return { configured: false, missingKey: false, platform };
  const apiKey = await apiKeyForPlatform();
  return { configured, missingKey: !apiKey, platform };
}

export async function configureRevenueCat(userId: string): Promise<void> {
  if (!isNativePayments()) return;
  const apiKey = await apiKeyForPlatform();
  if (!apiKey) {
    throw new Error(`Missing RevenueCat public SDK key for ${Capacitor.getPlatform()}`);
  }
  const Purchases = await loadPurchases();
  try {
    const nativeState = await (Purchases as any).isConfigured?.();
    if (nativeState?.isConfigured && !configured) configured = true;
  } catch {
    // Some older native bridges do not expose isConfigured; the local flag below
    // still protects the usual path.
  }
  if (!configured) {
    if (import.meta.env.DEV) {
      try { await (Purchases as any).setLogLevel?.({ level: "DEBUG" }); } catch {}
    }
    await Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
    currentAppUserId = userId;
    return;
  }
  if (currentAppUserId !== userId) {
    await Purchases.logIn({ appUserID: userId });
    currentAppUserId = userId;
  }
}

export async function logOutRevenueCat(): Promise<void> {
  if (!isNativePayments() || !configured) return;
  try {
    const Purchases = await loadPurchases();
    await Purchases.logOut();
  } catch (e) {
    console.warn("[revenuecat] logOut failed", e);
  } finally {
    currentAppUserId = null;
  }
}

export type RCPackage = {
  identifier: string;
  productIdentifier: string;
  priceString: string;
  title: string;
  period: "monthly" | "yearly" | "unknown";
  raw: unknown;
  source: "offering" | "product";
};

export async function getOfferings(): Promise<{ monthly: RCPackage | null; yearly: RCPackage | null }> {
  if (!isNativePayments()) return { monthly: null, yearly: null };
  const { Purchases, PRODUCT_CATEGORY } = await loadRevenueCat();

  const toRCFromPackage = (pkg: any, period: "monthly" | "yearly"): RCPackage => ({
    identifier: pkg.identifier,
    productIdentifier: pkg.product?.identifier ?? pkg.product?.productIdentifier ?? "",
    priceString: pkg.product?.priceString ?? pkg.product?.price_string ?? "",
    title: pkg.product?.title ?? "",
    period,
    raw: pkg,
    source: "offering",
  });

  const toRCFromProduct = (product: any, period: "monthly" | "yearly"): RCPackage => ({
    identifier: product.identifier,
    productIdentifier: product.identifier ?? product.productIdentifier ?? "",
    priceString: product.priceString ?? product.price_string ?? "",
    title: product.title ?? "",
    period,
    raw: product,
    source: "product",
  });

  const pickPeriod = (pkgOrProduct: any): "monthly" | "yearly" | null => {
    const product = pkgOrProduct?.product ?? pkgOrProduct;
    const subscriptionPeriod = String(product?.subscriptionPeriod ?? "").toUpperCase();
    if (subscriptionPeriod === "P1M") return "monthly";
    if (subscriptionPeriod === "P1Y") return "yearly";
    const type = String(pkg?.packageType ?? "").toUpperCase();
    if (type === "MONTHLY") return "monthly";
    if (type === "ANNUAL" || type === "YEARLY") return "yearly";
    const pid = String(product?.identifier ?? pkgOrProduct?.productIdentifier ?? "").toLowerCase();
    if (pid === PRODUCT_MONTHLY.toLowerCase()) return "monthly";
    if (pid === PRODUCT_YEARLY.toLowerCase()) return "yearly";
    if (pid.includes("month")) return "monthly";
    if (pid.includes("year") || pid.includes("annual")) return "yearly";
    const id = String(pkgOrProduct?.identifier ?? "").toLowerCase();
    if (id.includes("month")) return "monthly";
    if (id.includes("year") || id.includes("annual")) return "yearly";
    return null;
  };

  let monthly: RCPackage | null = null;
  let yearly: RCPackage | null = null;

  try {
    const res = await Purchases.getOfferings();
    // Prefer `current`, fall back to the first available offering if the user
    // hasn't marked one as current in the RC dashboard.
    const offering: any =
      (res as any).current ??
      Object.values(((res as any).all ?? {}) as Record<string, any>)[0] ??
      null;

    if (offering) {
      // 1) Try the standard RC shortcuts first.
      monthly = offering.monthly ? toRCFromPackage(offering.monthly, "monthly") : null;
      yearly = offering.annual ? toRCFromPackage(offering.annual, "yearly") : null;

      // 2) Fall back to scanning availablePackages (custom package identifiers).
      const available: any[] = offering.availablePackages ?? [];
      for (const pkg of available) {
        const period = pickPeriod(pkg);
        if (period === "monthly" && !monthly) monthly = toRCFromPackage(pkg, "monthly");
        if (period === "yearly" && !yearly) yearly = toRCFromPackage(pkg, "yearly");
      }

      if (!monthly || !yearly) {
        console.warn("[revenuecat] offering incomplete, falling back to direct products", {
          offeringId: offering.identifier,
          packageIds: available.map((p) => ({ id: p?.identifier, product: p?.product?.identifier, type: p?.packageType })),
        });
      }
    } else {
      console.warn("[revenuecat] getOfferings: no offering returned", res);
    }
  } catch (e) {
    // Do not block the paywall if the offering is not marked current or is badly
    // configured in RevenueCat. The StoreKit products can still be loaded and
    // purchased directly by product identifier below.
    console.warn("[revenuecat] getOfferings failed, falling back to getProducts", e);
  }

  // 3) Final robust fallback: fetch App Store / RevenueCat products directly
  // with the exact product IDs configured for H2GO.
  if (!monthly || !yearly) {
    const productRes = await Purchases.getProducts({
      productIdentifiers: [PRODUCT_MONTHLY, PRODUCT_YEARLY],
      type: PRODUCT_CATEGORY.SUBSCRIPTION,
    } as any);
    const products: any[] = (productRes as any).products ?? [];
    for (const product of products) {
      const period = pickPeriod(product);
      if (period === "monthly" && !monthly) monthly = toRCFromProduct(product, "monthly");
      if (period === "yearly" && !yearly) yearly = toRCFromProduct(product, "yearly");
    }
  }

  if (!monthly && !yearly) {
    console.warn("[revenuecat] no purchasable products found", { expected: [PRODUCT_MONTHLY, PRODUCT_YEARLY] });
  }

  return { monthly, yearly };
}

function hasPremiumEntitlement(customerInfo: any): boolean {
  const active = customerInfo?.entitlements?.active ?? {};
  if (ENTITLEMENT_ALIASES.some((id) => !!active[id])) return true;
  // In H2GO there is a single premium entitlement. If RevenueCat returns any
  // active entitlement, consider the native purchase successful so the app does
  // not reject a valid StoreKit transaction because of an identifier mismatch.
  return Object.keys(active).length > 0;
}

export async function purchasePackage(pkg: RCPackage): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  if (!isNativePayments()) return { success: false, error: "Not on native platform" };
  const Purchases = await loadPurchases();
  try {
    const result = pkg.source === "product"
      ? await Purchases.purchaseStoreProduct({ product: pkg.raw as any })
      : await Purchases.purchasePackage({ aPackage: pkg.raw as any });
    const entitlements = (result as any).customerInfo?.entitlements?.active ?? {};
    const active = hasPremiumEntitlement((result as any).customerInfo);
    if (!active) {
      console.warn("[revenuecat] purchase completed without active premium entitlement", {
        productIdentifier: pkg.productIdentifier,
        activeEntitlements: Object.keys(entitlements),
      });
    }
    return { success: active };
  } catch (e: any) {
    if (e?.userCancelled || e?.code === "1" || String(e?.message ?? "").toLowerCase().includes("cancel")) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: String(e?.message ?? e) };
  }
}

export async function restorePurchases(): Promise<{ active: boolean }> {
  if (!isNativePayments()) return { active: false };
  const Purchases = await loadPurchases();
  const res = await Purchases.restorePurchases();
  return { active: hasPremiumEntitlement((res as any).customerInfo) };
}

export async function hasActiveEntitlement(): Promise<boolean> {
  if (!isNativePayments() || !configured) return false;
  const Purchases = await loadPurchases();
  const res = await Purchases.getCustomerInfo();
  return hasPremiumEntitlement((res as any).customerInfo);
}

export function manageSubscriptionUrl(): string {
  const platform = Capacitor.getPlatform();
  if (platform === "android") return "https://play.google.com/store/account/subscriptions";
  // iOS: itms-apps:// opens the native App Store subscription management screen directly.
  if (platform === "ios") return "itms-apps://apps.apple.com/account/subscriptions";
  return "https://apps.apple.com/account/subscriptions";
}


/**
 * Present the RevenueCat-hosted Paywall (configured in the RC dashboard).
 * Returns the paywall result string ("PURCHASED" | "RESTORED" | "CANCELLED" | "ERROR" | "NOT_PRESENTED").
 */
export async function presentPaywall(): Promise<string> {
  if (!isNativePayments()) return "NOT_PRESENTED";
  try {
    const { RevenueCatUI, PAYWALL_RESULT } = await import("@revenuecat/purchases-capacitor-ui");
    const { result } = await RevenueCatUI.presentPaywall();
    return result ?? PAYWALL_RESULT.NOT_PRESENTED;
  } catch (e) {
    console.warn("[revenuecat] presentPaywall failed", e);
    return "ERROR";
  }
}

/**
 * Present the paywall only if the user does NOT have the H2GO Premium entitlement.
 */
export async function presentPaywallIfNeeded(): Promise<string> {
  if (!isNativePayments()) return "NOT_PRESENTED";
  try {
    const { RevenueCatUI, PAYWALL_RESULT } = await import("@revenuecat/purchases-capacitor-ui");
    const { result } = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
    });
    return result ?? PAYWALL_RESULT.NOT_PRESENTED;
  } catch (e) {
    console.warn("[revenuecat] presentPaywallIfNeeded failed", e);
    return "ERROR";
  }
}

/**
 * Present the RevenueCat Customer Center (subscription management, restore, refunds…).
 */
export async function presentCustomerCenter(): Promise<boolean> {
  if (!isNativePayments()) return false;
  try {
    const { RevenueCatUI } = await import("@revenuecat/purchases-capacitor-ui");
    await RevenueCatUI.presentCustomerCenter();
    return true;
  } catch (e) {
    console.warn("[revenuecat] presentCustomerCenter failed", e);
    return false;
  }
}

/**
 * Subscribe to CustomerInfo updates. Fires whenever entitlements change
 * (renewal, cancellation, restore, etc.).
 */
export async function addCustomerInfoListener(cb: (active: boolean) => void): Promise<() => void> {
  if (!isNativePayments()) return () => {};
  const Purchases = await loadPurchases();
  const handle = await (Purchases as any).addCustomerInfoUpdateListener?.((info: any) => {
    cb(hasPremiumEntitlement(info));
  });
  return () => {
    try { (Purchases as any).removeCustomerInfoUpdateListener?.(handle); } catch {}
  };
}
