import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Wipe everything a previous user left on the device: local notifications,
 * cached React Query data, our own localStorage keys, and (best-effort)
 * Capacitor Preferences. Never touch OAuth-broker state or Supabase's own
 * session keys — those are handled by supabase.auth.signOut().
 *
 * Safe to call multiple times / on the web (Capacitor stubs are no-ops).
 */
export async function purgeLocalUserData(): Promise<void> {
  // 1) Cancel every scheduled local notification (native only).
  try {
    if (Capacitor.isNativePlatform()) {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    }
  } catch {
    /* noop */
  }

  // 1b) RevenueCat logOut — reverts app_user_id to anonymous so the next
  // user isn't linked to the previous account's entitlements.
  try {
    const { logOutRevenueCat } = await import("./revenuecat");
    await logOutRevenueCat();
  } catch {
    /* noop */
  }

  // 2) Web timers used as notification fallbacks.
  try {
    const { cancelSecondPhotoReminder } = await import("./notifications");
    await cancelSecondPhotoReminder();
  } catch {
    /* noop */
  }

  // 3) Our own localStorage keys (h2go.*, plus the react-query cache mirror).
  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith("h2go.") ||
          key === "H2GO_QUERY_CACHE" ||
          key.startsWith("h2go-")
        ) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) window.localStorage.removeItem(key);
      window.sessionStorage.clear();
    } catch {
      /* noop */
    }
  }

  // 4) Capacitor Preferences (native cached key/value).
  try {
    if (Capacitor.isNativePlatform()) {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.clear();
    }
  } catch {
    /* noop */
  }
}
