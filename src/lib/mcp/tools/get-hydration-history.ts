import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_hydration_history",
  title: "Get hydration history",
  description:
    "Return daily hydration totals (ml) for the signed-in user over the last N days (1–90, default 7), plus current and best streak.",
  inputSchema: {
    days: z.number().int().min(1).max(90).optional().describe("Number of past days to return (default 7)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const nDays = days ?? 7;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (nDays - 1));

    const [{ data: logs, error: logsErr }, { data: streak, error: streakErr }] = await Promise.all([
      sb
        .from("hydration_logs")
        .select("volume_ml, created_at")
        .eq("user_id", ctx.getUserId())
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true }),
      sb
        .from("streaks")
        .select("current_streak, best_streak, last_log_date")
        .eq("user_id", ctx.getUserId())
        .maybeSingle(),
    ]);
    if (logsErr) return { content: [{ type: "text", text: logsErr.message }], isError: true };
    if (streakErr) return { content: [{ type: "text", text: streakErr.message }], isError: true };

    const byDay = new Map<string, number>();
    for (const l of logs ?? []) {
      const day = new Date(l.created_at).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (l.volume_ml ?? 0));
    }
    const daily: { date: string; total_ml: number }[] = [];
    for (let i = 0; i < nDays; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      daily.push({ date: key, total_ml: byDay.get(key) ?? 0 });
    }
    const result = {
      days: nDays,
      daily,
      streak: streak ?? { current_streak: 0, best_streak: 0, last_log_date: null },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
