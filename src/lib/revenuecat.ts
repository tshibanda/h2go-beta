/**
 * RevenueCat SDK wrapper for native iOS/Android.
 * On web this is a no-op — Stripe is used instead (see payment-router.ts).
 */
import { Capacitor } from "@capacitor/core";

// Product identifiers as configured in App Store Connect / Play Console.
export const PRODUCT_MONTHLY = "premium_monthly_v1";
export const PRODUCT_YEARLY = "premium_yearly_v1";
export const ENTITLEMENT_ID = "premium";

export function isNativePayments(): boolean {
  return Capacitor.isNativePlatform();
}

let configured = false;
let currentAppUserId: string | null = null;

async function loadPurchases() {
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod.Purchases;
}

async function apiKeyForPlatform(): Promise<string | null> {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return import.meta.env.VITE_REVENUECAT_APPLE_KEY ?? null;
  if (platform === "android") return import.meta.env.VITE_REVENUECAT_GOOGLE_KEY ?? null;
  return null;
}

export async function configureRevenueCat(userId: string): Promise<void> {
  if (!isNativePayments()) return;
  const apiKey = await apiKeyForPlatform();
  if (!apiKey) {
    console.warn("[revenuecat] Missing public SDK key for platform", Capacitor.getPlatform());
    return;
  }
  const Purchases = await loadPurchases();
  if (!configured) {
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
};

export async function getOfferings(): Promise<{ monthly: RCPackage | null; yearly: RCPackage | null }> {
  if (!isNativePayments()) return { monthly: null, yearly: null };
  const Purchases = await loadPurchases();
  const res = await Purchases.getOfferings();
  const current = res.current;
  if (!current) return { monthly: null, yearly: null };
  const toRC = (pkg: any, period: "monthly" | "yearly"): RCPackage => ({
    identifier: pkg.identifier,
    productIdentifier: pkg.product.identifier,
    priceString: pkg.product.priceString,
    title: pkg.product.title,
    period,
    raw: pkg,
  });
  const monthly = current.monthly ? toRC(current.monthly, "monthly") : null;
  const yearly = current.annual ? toRC(current.annual, "yearly") : null;
  return { monthly, yearly };
}

export async function purchasePackage(pkg: RCPackage): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  if (!isNativePayments()) return { success: false, error: "Not on native platform" };
  const Purchases = await loadPurchases();
  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg.raw as any });
    const entitlements = (result as any).customerInfo?.entitlements?.active ?? {};
    const active = !!entitlements[ENTITLEMENT_ID];
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
  const entitlements = (res as any).customerInfo?.entitlements?.active ?? {};
  return { active: !!entitlements[ENTITLEMENT_ID] };
}

export async function hasActiveEntitlement(): Promise<boolean> {
  if (!isNativePayments() || !configured) return false;
  const Purchases = await loadPurchases();
  const res = await Purchases.getCustomerInfo();
  const entitlements = (res as any).customerInfo?.entitlements?.active ?? {};
  return !!entitlements[ENTITLEMENT_ID];
}

export function manageSubscriptionUrl(): string {
  const platform = Capacitor.getPlatform();
  if (platform === "android") return "https://play.google.com/store/account/subscriptions";
  return "https://apps.apple.com/account/subscriptions";
}
