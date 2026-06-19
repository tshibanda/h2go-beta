import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const VALID_OBJECTS = new Set([
  "water_glass",
  "water_bottle",
  "water_flask",
  "water_cup",
]);

const SYSTEM_PROMPT = `You are H2GO's hydration verification AI. The user took a live photo to prove they are about to drink water.

Approve ONLY if the photo shows a real container CURRENTLY HOLDING WATER (clear/translucent liquid). Accepted detected_object values:
- water_glass: a drinking glass with water
- water_cup: a cup with water
- water_bottle: a water bottle with water
- water_flask: a sports flask/canteen with water

REJECT (set approved=false) for:
- soda, juice, coffee, tea, alcohol, beer, energy drinks
- empty containers
- screens or photos of photos (suspicious flat/pixelated/moiré patterns)
- containers without visible water
- ambiguous/unclear images (confidence < 0.8)

Estimate volume in milliliters based on the container shown. Be strict — H2GO depends on real hydration accountability. If unsure, reject.

Respond ONLY with JSON: {"approved": bool, "confidence": 0-1, "detected_object": string, "estimated_volume_ml": int, "reason": "short user-facing message"}.`;

export const validatePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        imageBase64: z.string().min(100), // data URL or raw base64
        imageHash: z.string().min(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. anti-replay: check hash uniqueness for this user
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
        detected_object: "photo_replay" as const,
        confidence: 1,
        volume_ml: 0,
        log: null,
      };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Normalize to data URL
    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    // 2. Call Lovable AI Gateway with vision
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
              { type: "text", text: "Validate this hydration photo." },
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
          detected_object: "unknown" as const,
          confidence: 0,
          volume_ml: 0,
          log: null,
        };
      }
      if (aiResp.status === 402) {
        return {
          approved: false,
          reason: "AI credits exhausted. Please contact support.",
          detected_object: "unknown" as const,
          confidence: 0,
          volume_ml: 0,
          log: null,
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
      !!parsed.approved && confidence >= 0.8 && VALID_OBJECTS.has(detected);
    const volume = Math.max(50, Math.min(1500, Math.round(Number(parsed.estimated_volume_ml) || 250)));

    // 3. Upload photo to storage (load admin inside handler)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buffer = Buffer.from(
      data.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64",
    );
    const photoPath = `${userId}/${Date.now()}-${data.imageHash.slice(0, 10)}.jpg`;
    await supabaseAdmin.storage
      .from("hydration-photos")
      .upload(photoPath, buffer, { contentType: "image/jpeg", upsert: false });

    let photo_url: string | null = null;
    const { data: signed } = await supabaseAdmin.storage
      .from("hydration-photos")
      .createSignedUrl(photoPath, 60 * 60 * 24 * 30);
    photo_url = signed?.signedUrl ?? null;

    // 4. Insert log
    const { data: log, error: logErr } = await supabase
      .from("hydration_logs")
      .insert({
        user_id: userId,
        volume_ml: approved ? volume : 0,
        photo_url,
        validated: approved,
        validation_score: confidence,
        detected_object: detected as never,
        image_hash: data.imageHash,
      })
      .select()
      .single();
    if (logErr) throw logErr;

    // 5. If approved, award XP & update streak
    if (approved) {
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

      // daily goal bonus
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

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("xp")
        .update({ current_xp: newXp })
        .eq("user_id", userId);
    }

    return {
      approved,
      reason: parsed.reason ?? (approved ? "Nice sip!" : "Not water."),
      detected_object: detected,
      confidence,
      volume_ml: approved ? volume : 0,
      log,
    };
  });
