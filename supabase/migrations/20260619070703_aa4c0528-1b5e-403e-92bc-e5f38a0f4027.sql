
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

-- Backfill existing free users with a fresh 7-day trial
UPDATE public.profiles
SET subscription_status = 'trialing', trial_ends_at = now() + interval '7 days'
WHERE subscription_status = 'free' AND trial_ends_at IS NULL;

UPDATE public.subscriptions
SET status = 'trialing', current_period_end = now() + interval '7 days'
WHERE status = 'free';

-- Update handle_new_user to grant a 7-day trial automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, subscription_status, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'trialing',
    now() + interval '7 days'
  );
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  INSERT INTO public.xp (user_id) VALUES (NEW.id);
  INSERT INTO public.subscriptions (user_id, status, current_period_end)
  VALUES (NEW.id, 'trialing', now() + interval '7 days');
  RETURN NEW;
END;
$function$;
