import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const VALID_OBJECTS = new Set([
  "water_glass",
  "water_bottle",
  "water_flask",
  "water_cup",
  "empty_container",
]);

const SYSTEM_PROMPT = `You are H2GO's hydration verification AI. The user is doing a TWO-PHOTO check of the SAME drinking container to measure how much water they actually drink. You receive ONE photo at a time and must report the CURRENT water level.

Rules for the photo provided:
- It must show a real drinking container (glass, cup, bottle, sports flask). Reject screens / photos-of-photos / unrelated images.
- If a liquid is visible it MUST be water (clear / translucent). Reject soda, juice, coffee, tea, alcohol, milk, etc.
- For step="before": the container must contain water (estimated_volume_ml > 0).
- For step="after": the container may be empty or partially full. Empty water containers are APPROVED with estimated_volume_ml = 0.
- Estimate the milliliters currently in the container, based on the visible water level and container size. Be conservative.
- detected_object must be one of: water_glass, water_cup, water_bottle, water_flask, empty_container.

Respond ONLY with JSON: {"approved": bool, "confidence": 0-1, "detected_object": string, "estimated_volume_ml": int, "reason": "short user-facing message"}.`;

type AnalyzeResult = {
  approved: boolean;
  reason: string;
  detected_object: string;
  confidence: number;
  estimated_volume_ml: number;
  photoPath: string | null;
  photoUrl: string | null;
  imageHash: string;
};

async function assertActiveSubscription(supabase: any, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const subStatus = sub?.status ?? null;
  const subEnd = (sub as { current_period_end?: string | null } | null)?.current_period_end;
  const subActive =
    (subStatus === "active" || subStatus === "trialing") &&
    (!subEnd || new Date(subEnd).getTime() > Date.now());
  if (!subActive) throw new Error("Forbidden: active subscription required");
}

export const analyzeContainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        imageBase64: z
          .string()
          .min(100)
          .max(1_500_000)
          .regex(/^(data:image\/(jpeg|jpg|png|webp);base64,)?[A-Za-z0-9+/=\s]+$/, {
            message: "Invalid base64 image payload",
          }),
        imageHash: z.string().min(8).max(128),
        step: z.enum(["before", "after"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<AnalyzeResult> => {
    const { supabase, userId } = context;
    await assertActiveSubscription(supabase, userId);

    // anti-replay
    const { data: existing } = await supabase
      .from("hydration_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("image_hash", data.imageHash)
      .maybeSingle();
    if (existing) {
      return {
        approved: false,
        reason: "This photo has already been used. Please take a new one.",
        detected_object: "photo_replay",
        confidence: 1,
        estimated_volume_ml: 0,
        photoPath: null,
        photoUrl: null,
        imageHash: data.imageHash,
      };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this hydration photo. step=${data.step}.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      if (aiResp.status === 429) {
        return {
          approved: false,
          reason: "AI is busy right now — please try again in a moment.",
          detected_object: "unknown",
          confidence: 0,
          estimated_volume_ml: 0,
          photoPath: null,
          photoUrl: null,
          imageHash: data.imageHash,
        };
      }
      if (aiResp.status === 402) {
        return {
          approved: false,
          reason: "AI credits exhausted. Please contact support.",
          detected_object: "unknown",
          confidence: 0,
          estimated_volume_ml: 0,
          photoPath: null,
          photoUrl: null,
          imageHash: data.imageHash,
        };
      }
      throw new Error(`AI gateway error: ${aiResp.status} ${text}`);
    }

    const aiJson = await aiResp.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      approved?: boolean;
      confidence?: number;
      detected_object?: string;
      estimated_volume_ml?: number;
      reason?: string;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    const detected = (parsed.detected_object ?? "unknown").toLowerCase();
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    const approved =
      !!parsed.approved && confidence >= 0.7 && VALID_OBJECTS.has(detected);
    const volume = Math.max(0, Math.min(2000, Math.round(Number(parsed.estimated_volume_ml) || 0)));

    let photoPath: string | null = null;
    let photoUrl: string | null = null;
    if (approved) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const buffer = Buffer.from(
        data.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        "base64",
      );
      photoPath = `${userId}/${Date.now()}-${data.step}-${data.imageHash.slice(0, 10)}.jpg`;
      await supabaseAdmin.storage
        .from("hydration-photos")
        .upload(photoPath, buffer, { contentType: "image/jpeg", upsert: false });
      const { data: signed } = await supabaseAdmin.storage
        .from("hydration-photos")
        .createSignedUrl(photoPath, 60 * 60 * 24 * 30);
      photoUrl = signed?.signedUrl ?? null;
    }

    return {
      approved,
      reason: parsed.reason ?? (approved ? "OK" : "Not a valid water container."),
      detected_object: detected,
      confidence,
      estimated_volume_ml: volume,
      photoPath,
      photoUrl,
      imageHash: data.imageHash,
    };
  });

export const finalizeTwoStepSip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        beforeMl: z.number().int().min(1).max(2000),
        afterMl: z.number().int().min(0).max(2000),
        beforeHash: z.string().min(8).max(128),
        afterHash: z.string().min(8).max(128),
        afterPhotoPath: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertActiveSubscription(supabase, userId);

    if (data.beforeHash === data.afterHash) {
      throw new Error("Before and after photos must differ");
    }

    const consumed = Math.max(0, data.beforeMl - data.afterMl);
    if (consumed < 20) {
      return {
        ok: false as const,
        reason: "We couldn't detect any water consumed between the two photos.",
        consumed_ml: consumed,
        log: null,
      };
    }
    const volume = Math.min(2000, consumed);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("hydration-photos")
      .createSignedUrl(data.afterPhotoPath, 60 * 60 * 24 * 30);
    const photo_url = signed?.signedUrl ?? null;

    const { data: log, error: logErr } = await supabase
      .from("hydration_logs")
      .insert({
        user_id: userId,
        volume_ml: volume,
        photo_url,
        validated: true,
        validation_score: 1,
        detected_object: "two_step" as never,
        image_hash: data.afterHash,
      })
      .select()
      .single();
    if (logErr) throw logErr;

    // Streak
    const today = new Date().toISOString().slice(0, 10);
    const { data: streak } = await supabase
      .from("streaks")
      .select("current_streak,best_streak,last_log_date")
      .eq("user_id", userId)
      .maybeSingle();

    let current = streak?.current_streak ?? 0;
    let best = streak?.best_streak ?? 0;
    const last = streak?.last_log_date as string | null;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      current = last === yesterday ? current + 1 : 1;
      best = Math.max(best, current);
      await supabase
        .from("streaks")
        .update({ current_streak: current, best_streak: best, last_log_date: today })
        .eq("user_id", userId);
    }

    // XP
    const { data: xpRow } = await supabase
      .from("xp")
      .select("current_xp,level")
      .eq("user_id", userId)
      .maybeSingle();
    let newXp = (xpRow?.current_xp ?? 0) + 10;

    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_goal_ml")
      .eq("id", userId)
      .maybeSingle();
    const goal = profile?.daily_goal_ml ?? 2500;

    const { data: todayLogs } = await supabase
      .from("hydration_logs")
      .select("volume_ml")
      .eq("user_id", userId)
      .eq("validated", true)
      .gte("created_at", `${today}T00:00:00Z`);
    const todayTotal = (todayLogs ?? []).reduce((a, r) => a + (r.volume_ml ?? 0), 0);
    const prevTotal = todayTotal - volume;
    if (prevTotal < goal && todayTotal >= goal) newXp += 50;

    await supabaseAdmin.from("xp").update({ current_xp: newXp }).eq("user_id", userId);

    return { ok: true as const, consumed_ml: volume, log };
  });
