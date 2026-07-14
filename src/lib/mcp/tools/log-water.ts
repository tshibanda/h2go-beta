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
  name: "log_water",
  title: "Log a water intake",
  description:
    "Record a hydration entry for the signed-in H2GO user. Provide volume in milliliters (1–3000 ml).",
  inputSchema: {
    volume_ml: z
      .number()
      .int()
      .min(1)
      .max(3000)
      .describe("Amount of water consumed, in milliliters."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ volume_ml }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("hydration_logs")
      .insert({ user_id: ctx.getUserId(), volume_ml, validated: true })
      .select("id, volume_ml, created_at")
      .single();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged ${data.volume_ml} ml at ${data.created_at}.` }],
      structuredContent: { entry: data },
    };
  },
});
