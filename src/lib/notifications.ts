import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export type ReminderConfig = {
  intervalHours: number; // 1, 2, 3...
  startHour: number; // 0-23
  endHour: number; // 0-23
};

const STORAGE_KEY = "h2go.reminderConfig";
const PROMPTED_KEY = "h2go.notifPromptedV1";
const CHANNEL_ID = "hydration";
const NOTIF_ID_BASE = 1000;

export const DEFAULT_CONFIG: ReminderConfig = {
  intervalHours: 2,
  startHour: 8,
  endHour: 22,
};

const TITLES_EN = ["💧 Time to hydrate!", "💦 Sip break!", "🚰 Hydration check"];
const BODIES_EN = [
  "Take a moment to drink a glass of water — your body will thank you!",
  "Just a few sips keep your energy high. Grab your bottle!",
  "Streak alert: stay on track with a refreshing drink now.",
  "Cells need water to thrive. Time for a quick sip!",
  "A glass of water = clearer mind. Go for it!",
];
const TITLES_FR = ["💧 C'est l'heure de t'hydrater !", "💦 Petite pause hydratation !", "🚰 Check hydratation"];
const BODIES_FR = [
  "Prends un instant pour boire un verre d'eau — ton corps te remerciera !",
  "Quelques gorgées suffisent pour garder l'énergie. Attrape ta bouteille !",
  "Garde ta série en vie : un petit verre d'eau maintenant 💪",
  "Tes cellules adorent l'eau. Une gorgée s'impose !",
  "Un verre d'eau = un esprit plus clair. Allez, à toi !",
];

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function loadConfig(): ReminderConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: ReminderConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch {
    return false;
  }
}

export async function maybePromptFirstLaunch(): Promise<void> {
  if (!isNative() || typeof window === "undefined") return;
  if (localStorage.getItem(PROMPTED_KEY)) return;
  localStorage.setItem(PROMPTED_KEY, "1");
  const granted = await requestNotificationPermission();
  if (granted) {
    await scheduleHydrationReminders(loadConfig(), "en");
  }
}

export async function cancelAllHydrationReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const ids = pending.notifications
      .map((n) => n.id)
      .filter((id) => id >= NOTIF_ID_BASE && id < NOTIF_ID_BASE + 100);
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    }
  } catch {
    /* noop */
  }
}

/**
 * Schedule notifications at specific HH:MM times (from the profile's reminders table).
 * Repeats daily. Replaces any existing hydration reminders.
 */
export async function scheduleHydrationRemindersAtTimes(
  times: string[],
  locale: "en" | "fr" = "en",
): Promise<{ ok: boolean; count: number; reason?: string }> {
  if (!isNative()) return { ok: false, count: 0, reason: "not-native" };

  const granted = await requestNotificationPermission();
  if (!granted) return { ok: false, count: 0, reason: "permission-denied" };

  await cancelAllHydrationReminders();

  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Hydration reminders",
      description: "Reminders to drink water",
      importance: 5,
      visibility: 1,
      sound: "alarm",
      vibration: true,
      lights: true,
    });
  } catch {
    /* noop */
  }

  const titles = locale === "fr" ? TITLES_FR : TITLES_EN;
  const bodies = locale === "fr" ? BODIES_FR : BODIES_EN;

  const parsed = times
    .map((t) => {
      const [h, m] = t.split(":").map(Number);
      return Number.isFinite(h) && Number.isFinite(m) ? { hour: h, minute: m } : null;
    })
    .filter((x): x is { hour: number; minute: number } => x !== null)
    .slice(0, 64);

  if (parsed.length === 0) return { ok: false, count: 0, reason: "no-times" };

  const notifications = parsed.map((t, i) => ({
    id: NOTIF_ID_BASE + i,
    title: titles[i % titles.length],
    body: bodies[i % bodies.length],
    channelId: CHANNEL_ID,
    sound: "alarm.wav",
    schedule: {
      on: { hour: t.hour, minute: t.minute },
      allowWhileIdle: true,
      repeats: true,
    },
    smallIcon: "ic_stat_icon_config_sample",
    extra: { critical: true },
  }));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await LocalNotifications.schedule({ notifications: notifications as any });
    return { ok: true, count: notifications.length };
  } catch (e) {
    return { ok: false, count: 0, reason: e instanceof Error ? e.message : "schedule-failed" };
  }
}

export async function scheduleHydrationReminders(
  cfg: ReminderConfig,
  locale: "en" | "fr" = "en",
): Promise<{ ok: boolean; count: number; reason?: string }> {
  if (!isNative()) return { ok: false, count: 0, reason: "not-native" };

  const granted = await requestNotificationPermission();
  if (!granted) return { ok: false, count: 0, reason: "permission-denied" };

  await cancelAllHydrationReminders();

  // Android channel: MAX importance for heads-up + loud alarm sound. iOS ignores channel.
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Hydration reminders",
      description: "Reminders to drink water",
      importance: 5, // MAX — heads-up banner + sound even in DND priority mode
      visibility: 1,
      // Reference to android/app/src/main/res/raw/alarm.mp3 (filename without extension)
      sound: "alarm",
      vibration: true,
      lights: true,
    });
  } catch {
    /* noop */
  }

  const titles = locale === "fr" ? TITLES_FR : TITLES_EN;
  const bodies = locale === "fr" ? BODIES_FR : BODIES_EN;

  const { intervalHours, startHour, endHour } = cfg;
  if (intervalHours < 1 || startHour >= endHour) {
    return { ok: false, count: 0, reason: "invalid-config" };
  }

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h += intervalHours) hours.push(h);

  const notifications = hours.map((hour, i) => {
    const title = titles[i % titles.length];
    const body = bodies[i % bodies.length];
    return {
      id: NOTIF_ID_BASE + i,
      title,
      body,
      channelId: CHANNEL_ID,
      // iOS: alarm.wav must be bundled in ios/App/App/. Android: filename without extension already on channel.
      sound: "alarm.wav",
      schedule: {
        on: { hour, minute: 0 },
        allowWhileIdle: true,
        repeats: true,
      },
      smallIcon: "ic_stat_icon_config_sample",
      // iOS critical-alert payload (requires entitlement; otherwise plays normally)
      extra: { critical: true },
    };
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await LocalNotifications.schedule({ notifications: notifications as any });
    return { ok: true, count: notifications.length };
  } catch (e) {
    return { ok: false, count: 0, reason: e instanceof Error ? e.message : "schedule-failed" };
  }
}
