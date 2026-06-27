import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Activity = z.enum(["low", "moderate", "high"]);
const Climate = z.enum(["temperate", "hot", "tropical", "dry", "cold"]);

export const setProfilePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        weight_kg: z.number().min(20).max(300).optional(),
        activity_level: Activity.optional(),
        climate_zone: Climate.optional(),
        dynamic_goal_enabled: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const update: {
      weight_kg?: number;
      activity_level?: string;
      climate_zone?: string;
      dynamic_goal_enabled?: boolean;
    } = {};
    if (data.weight_kg !== undefined) update.weight_kg = data.weight_kg;
    if (data.activity_level !== undefined) update.activity_level = data.activity_level;
    if (data.climate_zone !== undefined) update.climate_zone = data.climate_zone;
    if (data.dynamic_goal_enabled !== undefined)
      update.dynamic_goal_enabled = data.dynamic_goal_enabled;
    if (Object.keys(update).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(update).eq("id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const setDailyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        daily_goal_ml: z.number().int().min(500).max(6000),
        weather_temp_c: z.number().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("profiles")
      .update({
        daily_goal_ml: data.daily_goal_ml,
        last_goal_compute_date: today,
        last_goal_weather_temp_c: data.weather_temp_c ?? null,
      })
      .eq("id", userId);
    if (error) throw error;
    return { ok: true };
  });
