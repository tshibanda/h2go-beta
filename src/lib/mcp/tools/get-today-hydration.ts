import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_today_hydration",
  title: "Get today's hydration",
  description:
    "Return today's total water intake (ml), the user's daily goal, remaining volume, and the list of entries logged today.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [{ data: logs, error: logsErr }, { data: profile, error: profErr }] = await Promise.all([
      sb
        .from("hydration_logs")
        .select("id, volume_ml, created_at")
        .eq("user_id", ctx.getUserId())
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false }),
      sb.from("profiles").select("daily_goal_ml").eq("id", ctx.getUserId()).maybeSingle(),
    ]);
    if (logsErr) return { content: [{ type: "text", text: logsErr.message }], isError: true };
    if (profErr) return { content: [{ type: "text", text: profErr.message }], isError: true };
    const total = (logs ?? []).reduce((sum, l) => sum + (l.volume_ml ?? 0), 0);
    const goal = profile?.daily_goal_ml ?? 2500;
    const summary = { total_ml: total, goal_ml: goal, remaining_ml: Math.max(0, goal - total), entries: logs ?? [] };
    return {
      content: [
        {
          type: "text",
          text: `Today: ${total} / ${goal} ml (${Math.max(0, goal - total)} ml remaining).`,
        },
      ],
      structuredContent: summary,
    };
  },
});
