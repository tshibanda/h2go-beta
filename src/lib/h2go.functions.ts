import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [profileRes, streakRes, xpRes, logsRes, remindersRes, factsRes, achRes, userAchRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("xp").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("hydration_logs")
          .select("volume_ml,created_at,validated")
          .eq("user_id", userId)
          .eq("validated", true)
          .gte("created_at", `${today}T00:00:00Z`),
        supabase.from("reminders").select("*").eq("user_id", userId).order("reminder_time"),
        supabase.from("daily_facts").select("fact_text,category"),
        supabase.from("achievements").select("*"),
        supabase.from("user_achievements").select("achievement_id"),
      ]);

    const facts = factsRes.data ?? [];
    const dayOfYear = Math.floor(
      (Date.now() - Date.UTC(new Date().getFullYear(), 0, 0)) / 86400000,
    );
    const fact = facts.length ? facts[dayOfYear % facts.length] : null;

    const todayMl = (logsRes.data ?? []).reduce((a, r) => a + (r.volume_ml ?? 0), 0);

    return {
      profile: profileRes.data,
      streak: streakRes.data,
      xp: xpRes.data,
      reminders: remindersRes.data ?? [],
      achievements: achRes.data ?? [],
      userAchievements: (userAchRes.data ?? []).map((r) => r.achievement_id),
      todayMl,
      fact,
    };
  });

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await supabase
      .from("hydration_logs")
      .select("volume_ml,created_at,validated")
      .eq("user_id", userId)
      .eq("validated", true)
      .gte("created_at", start)
      .order("created_at");
    return data ?? [];
  });

export const getTotals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("hydration_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("validated", true);
    const { data } = await supabase
      .from("hydration_logs")
      .select("volume_ml")
      .eq("user_id", userId)
      .eq("validated", true);
    const totalMl = (data ?? []).reduce((a, r) => a + (r.volume_ml ?? 0), 0);
    return { totalValidations: count ?? 0, totalMl };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ league: z.enum(["bronze", "silver", "gold", "diamond"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [seedRes, meXpRes, meProfRes] = await Promise.all([
      supabase
        .from("leaderboard_seed")
        .select("*")
        .eq("league", data.league)
        .order("points", { ascending: false }),
      supabase.from("xp").select("current_xp").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
    ]);
    const seed = (seedRes.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      points: r.points,
      me: false,
    }));
    const meXp = meXpRes.data?.current_xp ?? 0;
    const me = {
      id: "me",
      name: meProfRes.data?.name ? `${meProfRes.data.name} (you)` : "You",
      avatar: "🌊",
      points: meXp,
      me: true,
    };
    const all = [...seed, me].sort((a, b) => b.points - a.points);
    return all;
  });

export const saveReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(3).max(12),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Validate 1 hour apart
    const sorted = [...data.times].sort();
    for (let i = 1; i < sorted.length; i++) {
      const [ah, am] = sorted[i - 1].split(":").map(Number);
      const [bh, bm] = sorted[i].split(":").map(Number);
      if (bh * 60 + bm - (ah * 60 + am) < 60) {
        throw new Error("Reminders must be at least 1 hour apart");
      }
    }
    await supabase.from("reminders").delete().eq("user_id", userId);
    const rows = sorted.map((t) => ({ user_id: userId, reminder_time: `${t}:00`, enabled: true }));
    const { error } = await supabase.from("reminders").insert(rows);
    if (error) throw error;
    return { ok: true };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(60),
        age: z.number().int().min(10).max(110),
        weight_kg: z.number().min(20).max(300),
        daily_goal_ml: z.number().int().min(500).max(6000),
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(3).max(12),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("profiles")
      .update({
        name: data.name,
        age: data.age,
        weight_kg: data.weight_kg,
        daily_goal_ml: data.daily_goal_ml,
        onboarded: true,
      })
      .eq("id", userId);

    const sorted = [...data.times].sort();
    await supabase.from("reminders").delete().eq("user_id", userId);
    await supabase
      .from("reminders")
      .insert(sorted.map((t) => ({ user_id: userId, reminder_time: `${t}:00`, enabled: true })));
    return { ok: true };
  });
