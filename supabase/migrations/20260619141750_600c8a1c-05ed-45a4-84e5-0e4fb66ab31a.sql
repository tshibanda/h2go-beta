
-- Replace the broad FOR ALL profile write policy with column-scoped policies.
DROP POLICY IF EXISTS "own profile write" ON public.profiles;

-- Block direct INSERT from clients (profile rows are seeded by handle_new_user trigger)
CREATE POLICY "no client insert profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (false);

-- Block client DELETE
CREATE POLICY "no client delete profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (false);

-- Allow self-update, but block changes to sensitive/payment fields via trigger.
CREATE POLICY "own profile update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only block when the update is performed as an end-user (not service_role / definer triggers).
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
       OR NEW.onboarded IS DISTINCT FROM OLD.onboarded
       OR NEW.tree_boost IS DISTINCT FROM OLD.tree_boost THEN
      RAISE EXCEPTION 'Not allowed to modify protected profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_cols ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_cols
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();
