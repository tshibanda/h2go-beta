import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import logWater from "./tools/log-water";
import getTodayHydration from "./tools/get-today-hydration";
import getHydrationHistory from "./tools/get-hydration-history";

// OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy
// (RFC 8414 issuer mismatch). VITE_SUPABASE_PROJECT_ID is inlined by Vite at
// build time. The fallback keeps the URL well-formed during the throwaway
// manifest-extract eval; real tokens never verify against the sentinel.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "h2go-mcp",
  title: "H2GO",
  version: "0.1.0",
  instructions:
    "Tools for H2GO, a hydration tracking app. Use `get_profile` and `get_today_hydration` to understand the user's current state, `log_water` to record a new intake in milliliters, and `get_hydration_history` for daily totals and streaks over the last N days.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, logWater, getTodayHydration, getHydrationHistory],
});
