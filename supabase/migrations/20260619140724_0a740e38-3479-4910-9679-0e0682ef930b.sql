-- Explicit deny: writes to these tables must go through service_role (server-side only).
-- Authenticated/anon users get no write access via restrictive policies.

CREATE POLICY "deny writes to authenticated" ON public.subscriptions
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "deny updates to authenticated" ON public.subscriptions
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "deny deletes to authenticated" ON public.subscriptions
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY "deny writes to authenticated" ON public.user_achievements
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "deny updates to authenticated" ON public.user_achievements
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "deny deletes to authenticated" ON public.user_achievements
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY "deny writes to authenticated" ON public.xp
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "deny updates to authenticated" ON public.xp
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "deny deletes to authenticated" ON public.xp
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);