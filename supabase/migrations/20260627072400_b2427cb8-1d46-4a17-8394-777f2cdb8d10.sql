
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activity_level text DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS climate_zone text DEFAULT 'temperate',
  ADD COLUMN IF NOT EXISTS dynamic_goal_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_goal_compute_date date,
  ADD COLUMN IF NOT EXISTS last_goal_weather_temp_c numeric;
