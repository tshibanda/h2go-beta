import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const adjustHydrationVolume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        logId: z.string().uuid(),
        volume_ml: z.number().int().min(50).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: log, error: fetchErr } = await supabase
      .from("hydration_logs")
      .select("id,user_id,validated")
      .eq("id", data.logId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!log || log.user_id !== userId) throw new Error("Not found");
    if (!log.validated) throw new Error("Log not validated");

    const { error: updErr } = await supabase
      .from("hydration_logs")
      .update({ volume_ml: data.volume_ml })
      .eq("id", data.logId);
    if (updErr) throw updErr;

    return { ok: true, volume_ml: data.volume_ml };
  });
