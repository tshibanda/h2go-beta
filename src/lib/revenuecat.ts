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
// RevenueCat public SDK keys are safe in the client bundle. Keeping the iOS key
// here prevents native builds from silently shipping without the Vite env value.
const H2GO_REVENUECAT_APPLE_PUBLIC_KEY = "appl_flAvSykHSAgPzJytulTjFGzDBeV";

export function isNativePayments(): boolean {
  return Capacitor.isNativePlatform();
}

let configured = false;
let currentAppUserId: string | null = null;
let configurePromise: Promise<void> | null = null;

async function loadRevenueCat() {
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod;
}

async function loadPurchases() {
  const mod = await loadRevenueCat();
  // IMPORTANT: never `return mod.Purchases` directly here. Capacitor plugin
  // objects are Proxies that respond to *any* property access — including
  // `.then` — which makes JS's Promise resolution algorithm treat them as
  // "thenable" and try to unwrap them by calling `Purchases.then(...)`.
  // That call gets routed to the native bridge as a method named "then",
  // which doesn't exist, throwing "Purchases.then() is not implemented on
  // ios" and silently breaking every await in this file. Wrapping in a
  // plain object avoids the false-positive thenable check.
  return { Purchases: mod.Purchases };
}

async function apiKeyForPlatform(): Promise<string | null> {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    return (
      import.meta.env.VITE_REVENUECAT_APPLE_KEY ??
      import.meta.env.VITE_REVENUECAT_IOS_KEY ??
      import.meta.env.VITE_REVENUECAT_PUBLIC_APPLE_KEY ??
      H2GO_REVENUECAT_APPLE_PUBLIC_KEY
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

export async function configureRevenueCat(userId: string, locale?: string): Promise<void> {
  if (!isNativePayments()) return;
  if (configurePromise) {
    await configurePromise;
    if (currentAppUserId === userId) {
      await overrideRevenueCatLocale(locale);
      return;
    }
  }

  const apiKey = await apiKeyForPlatform();
  if (!apiKey) {
    throw new Error(`Missing RevenueCat public SDK key for ${Capacitor.getPlatform()}`);
  }
  const { Purchases } = await loadPurchases();

  const finishUserBinding = async () => {
    if (currentAppUserId !== userId) {
      await Purchases.logIn({ appUserID: userId });
      currentAppUserId = userId;
    }
  };

  try {
    const nativeState = await (Purchases as any).isConfigured?.();
    if (nativeState?.isConfigured && !configured) configured = true;
  } catch {
    // Some older native bridges do not expose isConfigured; the local flag below
    // still protects the usual path.
  }
  if (!configured) {
    configurePromise = (async () => {
      if (import.meta.env.DEV) {
        try { await (Purchases as any).setLogLevel?.({ level: "DEBUG" }); } catch {}
      }
      const configuration: Record<string, unknown> = {
        apiKey,
        appUserID: userId,
        diagnosticsEnabled: true,
        ...(locale ? { preferredUILocaleOverride: locale } : {}),
      };
      await Purchases.configure(configuration as any);
      configured = true;
      currentAppUserId = userId;
    })();
    try {
      await configurePromise;
    } finally {
      configurePromise = null;
    }
    return;
  }
  await finishUserBinding();
  await overrideRevenueCatLocale(locale);
}

async function overrideRevenueCatLocale(locale?: string): Promise<void> {
  if (!locale || !isNativePayments()) return;
  try {
    const { Purchases } = await loadPurchases();
    await (Purchases as any).overridePreferredUILocale?.({ locale });
  } catch (e) {
    console.warn("[revenuecat] locale override failed", e);
  }
}

export async function logOutRevenueCat(): Promise<void> {
  if (!isNativePayments() || !configured) return;
  try {
    const { Purchases } = await loadPurchases();
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function productIdentifierOf(input: any): string {
  const product = input?.product ?? input;
  return String(product?.identifier ?? product?.productIdentifier ?? input?.productIdentifier ?? "");
}

function pickPeriod(pkgOrProduct: any): "monthly" | "yearly" | null {
  const product = pkgOrProduct?.product ?? pkgOrProduct;
  const pid = productIdentifierOf(pkgOrProduct).toLowerCase();
  if (pid === PRODUCT_MONTHLY.toLowerCase()) return "monthly";
  if (pid === PRODUCT_YEARLY.toLowerCase()) return "yearly";

  const subscriptionPeriod = String(product?.subscriptionPeriod ?? "").toUpperCase();
  if (subscriptionPeriod === "P1M") return "monthly";
  if (subscriptionPeriod === "P1Y") return "yearly";

  const type = String(pkgOrProduct?.packageType ?? "").toUpperCase();
  if (type === "MONTHLY") return "monthly";
  if (type === "ANNUAL" || type === "YEARLY") return "yearly";

  if (pid.includes("month")) return "monthly";
  if (pid.includes("year") || pid.includes("annual")) return "yearly";

  const id = String(pkgOrProduct?.identifier ?? "").toLowerCase();
  if (id.includes("month")) return "monthly";
  if (id.includes("year") || id.includes("annual")) return "yearly";
  return null;
}

function packageToPlan(pkg: any, period: "monthly" | "yearly"): RCPackage {
  const product = pkg?.product ?? {};
  return {
    identifier: String(pkg?.identifier ?? productIdentifierOf(pkg) ?? period),
    productIdentifier: productIdentifierOf(pkg),
    priceString: product?.priceString ?? product?.price_string ?? "",
    title: product?.title ?? "",
    period,
    raw: pkg,
    source: "offering",
  };
}

function productToPlan(product: any, period: "monthly" | "yearly"): RCPackage {
  return {
    identifier: productIdentifierOf(product) || period,
    productIdentifier: productIdentifierOf(product),
    priceString: product?.priceString ?? product?.price_string ?? "",
    title: product?.title ?? "",
    period,
    raw: product,
    source: "product",
  };
}

export async function getOfferings(): Promise<{ monthly: RCPackage | null; yearly: RCPackage | null }> {
  if (!isNativePayments()) return { monthly: null, yearly: null };
  const { Purchases, PRODUCT_CATEGORY } = await loadRevenueCat();

  let monthly: RCPackage | null = null;
  let yearly: RCPackage | null = null;

  // Prefer the RevenueCat Offering configured in the dashboard; this preserves
  // RevenueCat paywall/package metadata and still lets us purchase via StoreKit.
  if (!monthly || !yearly) {
    try {
      const res = await withTimeout(Purchases.getOfferings(), 7000, "getOfferings");
    // Prefer `current`, fall back to the first available offering if the user
    // hasn't marked one as current in the RC dashboard.
      const offering: any =
        (res as any).current ??
        Object.values(((res as any).all ?? {}) as Record<string, any>)[0] ??
        null;

      if (offering) {
        // Try the standard RC shortcuts first, then custom package identifiers.
        if (!monthly && offering.monthly) monthly = packageToPlan(offering.monthly, "monthly");
        if (!yearly && offering.annual) yearly = packageToPlan(offering.annual, "yearly");

        const available: any[] = offering.availablePackages ?? [];
        for (const pkg of available) {
          const period = pickPeriod(pkg);
          if (period === "monthly" && !monthly) monthly = packageToPlan(pkg, "monthly");
          if (period === "yearly" && !yearly) yearly = packageToPlan(pkg, "yearly");
        }

        if (!monthly || !yearly) {
          console.warn("[revenuecat] offering incomplete", {
          offeringId: offering.identifier,
          packageIds: available.map((p) => ({ id: p?.identifier, product: p?.product?.identifier, type: p?.packageType })),
          });
        }
      } else {
        console.warn("[revenuecat] getOfferings: no offering returned", res);
      }
    } catch (e) {
      console.warn("[revenuecat] getOfferings failed", e);
    }
  }

  // Fallback: load the real StoreKit products directly by the exact Apple IDs.
  // This keeps /premium functional even if the RevenueCat Offering is not marked
  // as Current or its package mapping is incomplete.
  if (!monthly || !yearly) {
    try {
      const productRes = await withTimeout(
        Purchases.getProducts({
          productIdentifiers: [PRODUCT_MONTHLY, PRODUCT_YEARLY],
          type: PRODUCT_CATEGORY?.SUBSCRIPTION ?? "SUBSCRIPTION",
        } as any),
        7000,
        "getProducts",
      );
      const products: any[] = (productRes as any).products ?? [];
      for (const product of products) {
        const period = pickPeriod(product);
        if (period === "monthly" && !monthly) monthly = productToPlan(product, "monthly");
        if (period === "yearly" && !yearly) yearly = productToPlan(product, "yearly");
      }
    } catch (e) {
      console.warn("[revenuecat] getProducts failed", e);
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
  const { Purchases } = await loadPurchases();
  try {
    const result = pkg.source === "offering"
      ? await Purchases.purchasePackage({ aPackage: pkg.raw as any })
      : await Purchases.purchaseStoreProduct({ product: pkg.raw as any });
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
  const { Purchases } = await loadPurchases();
  const res = await Purchases.restorePurchases();
  return { active: hasPremiumEntitlement((res as any).customerInfo) };
}

/**
 * Force RevenueCat to re-sync with the App Store after a purchase made
 * outside of RevenueCat's own purchase methods (e.g. via SubscriptionStoreView,
 * which talks to StoreKit 2 directly). RevenueCat's transaction observer
 * normally picks these up automatically, but this is a safety net for
 * entitlement checks that happen immediately after.
 */
export async function syncPurchases(): Promise<{ active: boolean }> {
  if (!isNativePayments() || !configured) return { active: false };
  const { Purchases } = await loadPurchases();
  try {
    const res = await (Purchases as any).syncPurchases?.();
    const info = (res as any)?.customerInfo ?? (await Purchases.getCustomerInfo()).customerInfo;
    return { active: hasPremiumEntitlement(info) };
  } catch (e) {
    console.warn("[revenuecat] syncPurchases failed", e);
    return { active: await hasActiveEntitlement() };
  }
}

export async function hasActiveEntitlement(): Promise<boolean> {
  if (!isNativePayments() || !configured) return false;
  const { Purchases } = await loadPurchases();
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
    const { RevenueCatUI, PAYWALL_RESULT, PaywallPresentationConfiguration } = await import("@revenuecat/purchases-capacitor-ui");
    const { result } = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
      presentationConfiguration: PaywallPresentationConfiguration.FULL_SCREEN,
    });
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
    const { RevenueCatUI, PAYWALL_RESULT, PaywallPresentationConfiguration } = await import("@revenuecat/purchases-capacitor-ui");
    const { result } = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
      displayCloseButton: true,
      presentationConfiguration: PaywallPresentationConfiguration.FULL_SCREEN,
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
  const { Purchases } = await loadPurchases();
  const handle = await (Purchases as any).addCustomerInfoUpdateListener?.((info: any) => {
    cb(hasPremiumEntitlement(info));
  });
  return () => {
    try { (Purchases as any).removeCustomerInfoUpdateListener?.(handle); } catch {}
  };
}