-- Stop granting an automatic 7-day trial on signup. The free trial now
-- only starts after the user enters valid payment information through
-- Stripe Checkout (which creates a `trialing` subscription).
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
    'free',
    NULL
  );
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  INSERT INTO public.xp (user_id) VALUES (NEW.id);
  INSERT INTO public.subscriptions (user_id, status, current_period_end)
  VALUES (NEW.id, 'free', NULL);
  RETURN NEW;
END;
$function$;