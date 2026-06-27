// Client-side helpers to compute a dynamic daily hydration goal
// using weight, activity level, climate zone and the day's weather
// (Open-Meteo, free, no API key, CORS-friendly).

export type ActivityLevel = "low" | "moderate" | "high";
export type ClimateZone = "temperate" | "hot" | "tropical" | "dry" | "cold";

export type GoalInput = {
  weightKg: number | null;
  activity: ActivityLevel;
  climate: ClimateZone;
  tempMaxC: number | null;
  humidity: number | null;
};

export type GoalResult = {
  goalMl: number;
  baseMl: number;
  weatherBoostPct: number; // e.g. 10 means +10%
  reason: string;
};

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  low: 0.95,
  moderate: 1.0,
  high: 1.1,
};

const CLIMATE_BONUS: Record<ClimateZone, number> = {
  temperate: 0,
  cold: 0,
  hot: 0.05,
  tropical: 0.08,
  dry: 0.05,
};

export function computeGoal(input: GoalInput): GoalResult {
  const w = input.weightKg && input.weightKg > 0 ? input.weightKg : 70;
  const base = Math.round(w * 35); // ml
  let mult = ACTIVITY_MULT[input.activity] ?? 1;
  let weatherBoost = 0;

  if (input.tempMaxC != null) {
    if (input.tempMaxC >= 32) weatherBoost += 0.2;
    else if (input.tempMaxC >= 28) weatherBoost += 0.1;
    else if (input.tempMaxC >= 24) weatherBoost += 0.05;
  }
  if (input.humidity != null && input.humidity >= 70 && (input.tempMaxC ?? 0) >= 22) {
    weatherBoost += 0.05;
  }

  mult += weatherBoost;
  mult += CLIMATE_BONUS[input.climate] ?? 0;

  // Clamp 800 ml .. 5000 ml
  const goal = Math.max(800, Math.min(5000, Math.round(base * mult)));

  let reason = `${w} kg × 35 ml`;
  if (input.tempMaxC != null) reason += ` · ${Math.round(input.tempMaxC)}°C`;
  if (weatherBoost > 0) reason += ` (+${Math.round(weatherBoost * 100)}% météo)`;

  return {
    goalMl: goal,
    baseMl: base,
    weatherBoostPct: Math.round(weatherBoost * 100),
    reason,
  };
}

export async function fetchTodayWeather(
  lat: number,
  lon: number,
): Promise<{ tempMaxC: number | null; humidity: number | null }> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,relative_humidity_2m_max&timezone=auto&forecast_days=1`;
    const r = await fetch(url);
    if (!r.ok) return { tempMaxC: null, humidity: null };
    const j = (await r.json()) as {
      daily?: {
        temperature_2m_max?: (number | null)[];
        relative_humidity_2m_max?: (number | null)[];
      };
    };
    return {
      tempMaxC: j.daily?.temperature_2m_max?.[0] ?? null,
      humidity: j.daily?.relative_humidity_2m_max?.[0] ?? null,
    };
  } catch {
    return { tempMaxC: null, humidity: null };
  }
}

export function requestPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 3600_000 },
    );
  });
}
