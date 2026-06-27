import { Capacitor } from "@capacitor/core";
import { scheduleHydrationRemindersAtTimes, type ReminderConfig } from "./notifications";

/**
 * Notifications adaptatives H2GO.
 *
 * On part d'une fenêtre [startHour, endHour] + intervalHours (config user),
 * puis on ajoute / retire des créneaux selon :
 *  - la météo du jour (chaleur / humidité) via Open-Meteo
 *  - l'activité physique récente (HealthKit, si dispo)
 *  - l'heure de la journée (densifier en milieu de journée, alléger le soir)
 *
 * Tout est best-effort : si une source échoue on garde les rappels de base.
 */

type Coords = { lat: number; lon: number };

type WeatherSignals = {
  tempMaxC: number | null;
  humidityMean: number | null;
};

type ActivitySignals = {
  exerciseMinutesToday: number;
};

export type AdaptiveResult = {
  ok: boolean;
  count: number;
  times: string[];
  reason?: string;
  signals: {
    weather: WeatherSignals;
    activity: ActivitySignals;
    extraSlots: number;
  };
};

function getBrowserCoords(timeoutMs = 4000): Promise<Coords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude });
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: timeoutMs },
    );
  });
}

async function fetchWeather(coords: Coords): Promise<WeatherSignals> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,relative_humidity_2m_mean&timezone=auto&forecast_days=1`;
    const r = await fetch(url);
    if (!r.ok) return { tempMaxC: null, humidityMean: null };
    const j = (await r.json()) as {
      daily?: { temperature_2m_max?: number[]; relative_humidity_2m_mean?: number[] };
    };
    return {
      tempMaxC: j.daily?.temperature_2m_max?.[0] ?? null,
      humidityMean: j.daily?.relative_humidity_2m_mean?.[0] ?? null,
    };
  } catch {
    return { tempMaxC: null, humidityMean: null };
  }
}

/**
 * Lecture HealthKit (workouts du jour) si le plugin est installé.
 * On charge le plugin dynamiquement pour ne pas casser le bundle web.
 */
async function fetchActivity(): Promise<ActivitySignals> {
  const empty: ActivitySignals = { exerciseMinutesToday: 0 };
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return empty;
    // Plugin optionnel : @perfood/capacitor-healthkit
    const mod = (await import(/* @vite-ignore */ "@perfood/capacitor-healthkit").catch(
      () => null,
    )) as null | {
      CapacitorHealthkit: {
        requestAuthorization: (opts: unknown) => Promise<unknown>;
        queryHKitSampleType: (opts: unknown) => Promise<{ resultData?: Array<{ duration: number }> }>;
      };
    };
    if (!mod?.CapacitorHealthkit) return empty;
    const hk = mod.CapacitorHealthkit;
    await hk.requestAuthorization({
      all: [""],
      read: ["workoutType", "activeEnergyBurned"],
      write: [],
    });
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const res = await hk.queryHKitSampleType({
      sampleName: "workoutType",
      startDate: start.toISOString(),
      endDate: new Date().toISOString(),
      limit: 50,
    });
    const minutes = (res.resultData ?? []).reduce((acc, w) => acc + (w.duration || 0) / 60, 0);
    return { exerciseMinutesToday: Math.round(minutes) };
  } catch {
    return empty;
  }
}

/**
 * Construit la liste des créneaux (HH:MM) selon la config + signaux.
 */
export function buildAdaptiveTimes(
  cfg: ReminderConfig,
  weather: WeatherSignals,
  activity: ActivitySignals,
): { times: string[]; extraSlots: number } {
  const { intervalHours, startHour, endHour } = cfg;
  if (intervalHours < 1 || startHour >= endHour) {
    return { times: [], extraSlots: 0 };
  }

  // Base : un créneau toutes les intervalHours
  const baseHours: number[] = [];
  for (let h = startHour; h <= endHour; h += intervalHours) baseHours.push(h);

  // Bonus chaleur
  let extra = 0;
  const t = weather.tempMaxC ?? 0;
  if (t >= 32) extra += 3;
  else if (t >= 28) extra += 2;
  else if (t >= 24) extra += 1;

  // Bonus humidité (sudation perçue)
  if ((weather.humidityMean ?? 0) >= 70) extra += 1;

  // Bonus activité physique (HealthKit)
  if (activity.exerciseMinutesToday >= 60) extra += 2;
  else if (activity.exerciseMinutesToday >= 30) extra += 1;

  // On insère les créneaux supplémentaires aux heures les plus chaudes (12h-17h)
  const peakWindow: number[] = [];
  for (let h = Math.max(startHour, 12); h <= Math.min(endHour, 17); h++) {
    peakWindow.push(h);
  }

  const finalSlots = new Set<string>();
  for (const h of baseHours) finalSlots.add(`${String(h).padStart(2, "0")}:00`);

  let added = 0;
  for (let i = 0; i < peakWindow.length && added < extra; i++) {
    // ajoute la demi-heure
    const h = peakWindow[i];
    finalSlots.add(`${String(h).padStart(2, "0")}:30`);
    added++;
  }
  // si encore du quota, on resserre tôt l'après-midi
  for (let h = startHour + 1; h < endHour && added < extra; h++) {
    finalSlots.add(`${String(h).padStart(2, "0")}:30`);
    added++;
  }

  const times = Array.from(finalSlots).sort();
  return { times, extraSlots: added };
}

/**
 * Calcule + programme les rappels adaptatifs. Sans coordonnées, fallback "base".
 */
export async function scheduleAdaptiveHydrationReminders(
  cfg: ReminderConfig,
  locale: "en" | "fr" = "fr",
): Promise<AdaptiveResult> {
  const coords = await getBrowserCoords();
  const weather = coords
    ? await fetchWeather(coords)
    : ({ tempMaxC: null, humidityMean: null } as WeatherSignals);
  const activity = await fetchActivity();

  const { times, extraSlots } = buildAdaptiveTimes(cfg, weather, activity);
  if (times.length === 0) {
    return {
      ok: false,
      count: 0,
      times: [],
      reason: "no-times",
      signals: { weather, activity, extraSlots },
    };
  }

  const res = await scheduleHydrationRemindersAtTimes(times, locale);
  rememberNextReminder(times);

  return {
    ok: res.ok,
    count: res.count,
    times,
    reason: res.reason,
    signals: { weather, activity, extraSlots },
  };
}

/**
 * Variante : on garde les créneaux configurés par l'utilisateur ET on ajoute
 * des créneaux supplémentaires aux heures chaudes selon météo + activité.
 */
export async function scheduleAdaptiveFromUserTimes(
  baseTimes: string[],
  locale: "en" | "fr" = "fr",
  endHour = 22,
): Promise<AdaptiveResult> {
  const coords = await getBrowserCoords();
  const weather = coords
    ? await fetchWeather(coords)
    : ({ tempMaxC: null, humidityMean: null } as WeatherSignals);
  const activity = await fetchActivity();

  // Combien d'extras ?
  let extra = 0;
  const t = weather.tempMaxC ?? 0;
  if (t >= 32) extra += 3;
  else if (t >= 28) extra += 2;
  else if (t >= 24) extra += 1;
  if ((weather.humidityMean ?? 0) >= 70) extra += 1;
  if (activity.exerciseMinutesToday >= 60) extra += 2;
  else if (activity.exerciseMinutesToday >= 30) extra += 1;

  const slots = new Set<string>(baseTimes.map((s) => s.slice(0, 5)));
  let added = 0;
  for (let h = 12; h <= Math.min(endHour, 17) && added < extra; h++) {
    const candidate = `${String(h).padStart(2, "0")}:30`;
    if (!slots.has(candidate)) {
      slots.add(candidate);
      added++;
    }
  }
  const times = Array.from(slots).sort();
  const res = await scheduleHydrationRemindersAtTimes(times, locale);
  rememberNextReminder(times);
  return {
    ok: res.ok,
    count: res.count,
    times,
    reason: res.reason,
    signals: { weather, activity, extraSlots: added },
  };
}

function rememberNextReminder(times: string[]) {
  try {
    if (typeof window === "undefined") return;
    const now = new Date();
    const next = times
      .map((t) => {
        const [h, m] = t.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
        return d;
      })
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (next) localStorage.setItem("h2go.nextReminder", next.toISOString());
  } catch {
    /* noop */
  }
}
