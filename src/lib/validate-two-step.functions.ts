import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const VALID_OBJECTS = new Set([
  "water_glass",
  "water_bottle",
  "water_flask",
  "water_cup",
]);

const BEFORE_PROMPT = `You are H2GO's hydration verification AI. The user is ABOUT to drink water and took a "BEFORE" photo of their container.

Approve ONLY if the photo shows a real container CURRENTLY HOLDING WATER (clear/translucent liquid). Accepted detected_object values:
- water_glass, water_cup, water_bottle, water_flask

REJECT (approved=false) for:
- soda, juice, coffee, tea, alcohol, energy drinks
- empty containers
- photos of screens / photos of photos
- ambiguous shots (confidence < 0.75)

Estimate the CURRENT water volume in the container, in millilitres.

Respond ONLY with JSON: {"approved": bool, "confidence": 0-1, "detected_object": string, "current_volume_ml": int, "reason": "short user-facing message"}.`;

const AFTER_PROMPT = `You are H2GO's hydration verification AI. The user just DRANK from a container and took an "AFTER" photo of the same container.

Approve if the photo shows a plausible drinking container (glass, cup, bottle, flask). It may still contain some water or be nearly empty.
REJECT only if it's clearly unrelated (a person, a screen photo, random object) or a photo of a photo. Use confidence < 0.7 to reject ambiguous shots.

Estimate the REMAINING water volume in the container in millilitres (0 if empty).

Respond ONLY with JSON: {"approved": bool, "confidence": 0-1, "detected_object": string, "remaining_volume_ml": int, "reason": "short user-facing message"}.`;

const ImgSchema = z.object({
  imageBase64: z
    .string()
    .min(100)
    .max(1_500_000)
    .regex(/^(data:image\/(jpeg|jpg|png|webp);base64,)?[A-Za-z0-9+/=\s]+$/),
  imageHash: z.string().min(8).max(128),
});

async function ensureSub(supabase: any, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const end = sub?.current_period_end as string | null | undefined;
  const active =
    (sub?.status === "active" || sub?.status === "trialing") &&
    (!end || new Date(end).getTime() > Date.now());
  if (!active) throw new Error("Forbidden: active subscription required");
}

async function callVision(dataUrl: string, prompt: string, key: string) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this hydration photo." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
}

function dataUrlOf(b64: string) {
  return b64.startsWith("data:") ? b64 : `data:image/jpeg;base64,${b64}`;
}

export const analyzeBeforePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImgSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureSub(supabase, userId);

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
        confidence: 1,
        before_volume_ml: 0,
        before_photo_path: null as string | null,
        before_image_hash: data.imageHash,
      };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const aiResp = await callVision(dataUrlOf(data.imageBase64), BEFORE_PROMPT, key);
    if (!aiResp.ok) {
      if (aiResp.status === 429)
        return { approved: false, reason: "AI is busy — please try again.", confidence: 0, before_volume_ml: 0, before_photo_path: null, before_image_hash: data.imageHash };
      if (aiResp.status === 402)
        return { approved: false, reason: "AI credits exhausted. Please contact support.", confidence: 0, before_volume_ml: 0, before_photo_path: null, before_image_hash: data.imageHash };
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      approved?: boolean;
      confidence?: number;
      detected_object?: string;
      current_volume_ml?: number;
      reason?: string;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    const detected = String(parsed.detected_object ?? "unknown").toLowerCase();
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    const approved = !!parsed.approved && confidence >= 0.75 && VALID_OBJECTS.has(detected);
    const beforeMl = Math.max(50, Math.min(2000, Math.round(Number(parsed.current_volume_ml) || 250)));

    if (!approved) {
      return {
        approved: false,
        reason: parsed.reason ?? "Couldn't detect water in this photo.",
        confidence,
        before_volume_ml: 0,
        before_photo_path: null,
        before_image_hash: data.imageHash,
      };
    }

    // Upload before photo
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buffer = Buffer.from(
      data.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64",
    );
    const photoPath = `${userId}/before-${Date.now()}-${data.imageHash.slice(0, 10)}.jpg`;
    await supabaseAdmin.storage
      .from("hydration-photos")
      .upload(photoPath, buffer, { contentType: "image/jpeg", upsert: false });

    return {
      approved: true,
      reason: parsed.reason ?? "Container detected — go drink!",
      confidence,
      before_volume_ml: beforeMl,
      before_photo_path: photoPath,
      before_image_hash: data.imageHash,
      detected_object: detected,
    };
  });

const AfterSchema = z.object({
  imageBase64: z
    .string()
    .min(100)
    .max(1_500_000)
    .regex(/^(data:image\/(jpeg|jpg|png|webp);base64,)?[A-Za-z0-9+/=\s]+$/),
  imageHash: z.string().min(8).max(128),
  beforePhotoPath: z.string().min(1).max(300),
  beforeVolumeMl: z.number().int().min(50).max(2000),
  beforeImageHash: z.string().min(8).max(128),
});

export const validateAfterPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AfterSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureSub(supabase, userId);

    // ownership check on before photo path
    if (!data.beforePhotoPath.startsWith(`${userId}/before-`)) {
      throw new Error("Invalid before photo");
    }

    // anti-replay on this after photo
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
        confidence: 1,
        volume_ml: 0,
        log: null,
      };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const aiResp = await callVision(dataUrlOf(data.imageBase64), AFTER_PROMPT, key);
    if (!aiResp.ok) {
      if (aiResp.status === 429)
        return { approved: false, reason: "AI is busy — please try again.", confidence: 0, volume_ml: 0, log: null };
      if (aiResp.status === 402)
        return { approved: false, reason: "AI credits exhausted.", confidence: 0, volume_ml: 0, log: null };
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }
    const aiJson = await aiResp.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      approved?: boolean;
      confidence?: number;
      detected_object?: string;
      remaining_volume_ml?: number;
      reason?: string;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    const approved = !!parsed.approved && confidence >= 0.7;
    if (!approved) {
      return {
        approved: false,
        reason: parsed.reason ?? "Couldn't verify your after-photo.",
        confidence,
        volume_ml: 0,
        log: null,
      };
    }
    const remainingMl = Math.max(0, Math.min(2000, Math.round(Number(parsed.remaining_volume_ml) || 0)));
    const diff = data.beforeVolumeMl - remainingMl;
    if (diff < 20) {
      return {
        approved: false,
        reason: "Doesn't look like you drank anything — try again after a sip.",
        confidence,
        volume_ml: 0,
        log: null,
      };
    }
    const volume = Math.max(50, Math.min(1500, diff));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buffer = Buffer.from(
      data.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64",
    );
    const afterPath = `${userId}/after-${Date.now()}-${data.imageHash.slice(0, 10)}.jpg`;
    await supabaseAdmin.storage
      .from("hydration-photos")
      .upload(afterPath, buffer, { contentType: "image/jpeg", upsert: false });
    const { data: signed } = await supabaseAdmin.storage
      .from("hydration-photos")
      .createSignedUrl(afterPath, 60 * 60 * 24 * 30);

    return await finalizeLog({
      supabase,
      userId,
      volume,
      photo_url: signed?.signedUrl ?? null,
      imageHash: data.imageHash,
      confidence,
      detected: "water_glass",
    });
  });

const ManualSchema = z.object({
  beforePhotoPath: z.string().min(1).max(300),
  beforeImageHash: z.string().min(8).max(128),
  volume_ml: z.number().int().min(50).max(1500),
});

export const logManualSip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ManualSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureSub(supabase, userId);
    if (!data.beforePhotoPath.startsWith(`${userId}/before-`)) {
      throw new Error("Invalid before photo");
    }
    // prevent submitting many manual logs from a single before photo
    const { data: existing } = await supabase
      .from("hydration_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("image_hash", data.beforeImageHash)
      .maybeSingle();
    if (existing) {
      return {
        approved: false,
        reason: "This session was already logged.",
        confidence: 1,
        volume_ml: 0,
        log: null,
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("hydration-photos")
      .createSignedUrl(data.beforePhotoPath, 60 * 60 * 24 * 30);
    return await finalizeLog({
      supabase,
      userId,
      volume: data.volume_ml,
      photo_url: signed?.signedUrl ?? null,
      imageHash: data.beforeImageHash,
      confidence: 0.6,
      detected: "water_glass",
    });
  });

async function finalizeLog(args: {
  supabase: any;
  userId: string;
  volume: number;
  photo_url: string | null;
  imageHash: string;
  confidence: number;
  detected: string;
}) {
  const { supabase, userId, volume, photo_url, imageHash, confidence, detected } = args;

  const { data: log, error: logErr } = await supabase
    .from("hydration_logs")
    .insert({
      user_id: userId,
      volume_ml: volume,
      photo_url,
      validated: true,
      validation_score: confidence,
      detected_object: detected as never,
      image_hash: imageHash,
    })
    .select()
    .single();
  if (logErr) throw logErr;

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
  const todayTotal = (todayLogs ?? []).reduce(
    (a: number, r: { volume_ml: number | null }) => a + (r.volume_ml ?? 0),
    0,
  );
  const prevTotal = todayTotal - volume;
  if (prevTotal < goal && todayTotal >= goal) newXp += 50;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("xp").update({ current_xp: newXp }).eq("user_id", userId);

  return {
    approved: true,
    reason: "Nice sip!",
    confidence,
    volume_ml: volume,
    log,
  };
}
