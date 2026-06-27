import { Capacitor } from "@capacitor/core";

/**
 * Bridge léger pour alimenter le Widget iOS (WidgetKit).
 *
 * Le widget Swift lit les données via UserDefaults(suiteName: APP_GROUP).
 * Côté web, on passe par @capacitor/preferences configuré avec le même
 * App Group ("group.com.h2go.app") — cf. instructions dans
 * ios/App/H2GOWidget/README.md.
 *
 * Tant que le plugin Preferences n'est pas configuré avec l'App Group,
 * cet appel est un no-op silencieux : aucune régression web.
 */

export type WidgetSnapshot = {
  intakeMl: number;
  goalMl: number;
  percent: number;
  nextReminderISO: string | null;
  updatedAtISO: string;
};

export async function pushWidgetSnapshot(snap: Omit<WidgetSnapshot, "updatedAtISO" | "percent">): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;

    const payload: WidgetSnapshot = {
      ...snap,
      percent: snap.goalMl > 0 ? Math.min(100, Math.round((snap.intakeMl / snap.goalMl) * 100)) : 0,
      updatedAtISO: new Date().toISOString(),
    };

    const mod = (await import(/* @vite-ignore */ "@capacitor/preferences").catch(() => null)) as null | {
      Preferences: {
        configure?: (opts: { group?: string }) => Promise<void>;
        set: (opts: { key: string; value: string }) => Promise<void>;
      };
    };
    if (!mod?.Preferences) return;
    try {
      await mod.Preferences.configure?.({ group: "group.com.h2go.app" });
    } catch {
      /* configure may not be supported on all versions */
    }
    await mod.Preferences.set({ key: "h2go_widget_snapshot", value: JSON.stringify(payload) });

    // Demande à WidgetKit de rafraîchir (via plugin custom si présent)
    try {
      const reload = (window as unknown as { H2GOWidget?: { reload?: () => Promise<void> } }).H2GOWidget;
      await reload?.reload?.();
    } catch {
      /* noop */
    }
  } catch {
    /* widget bridge is best-effort */
  }
}
