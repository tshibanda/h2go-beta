
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.subscription_status AS ENUM ('free','trialing','active','past_due','canceled');
CREATE TYPE public.detected_object AS ENUM ('water_glass','water_bottle','water_flask','water_cup','soda','juice','coffee','tea','alcohol','empty','screen','photo_replay','unknown');

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  weight_kg NUMERIC,
  age INT,
  daily_goal_ml INT NOT NULL DEFAULT 2500,
  subscription_status public.subscription_status NOT NULL DEFAULT 'free',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================
-- REMINDERS
-- =========================================
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reminders_user_idx ON public.reminders(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reminders" ON public.reminders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- HYDRATION LOGS
-- =========================================
CREATE TABLE public.hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volume_ml INT NOT NULL,
  photo_url TEXT,
  validated BOOLEAN NOT NULL DEFAULT false,
  validation_score NUMERIC,
  detected_object public.detected_object,
  image_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, image_hash)
);
CREATE INDEX hydration_logs_user_date_idx ON public.hydration_logs(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hydration_logs TO authenticated;
GRANT ALL ON public.hydration_logs TO service_role;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs" ON public.hydration_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- STREAKS
-- =========================================
CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  last_log_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streaks TO authenticated;
GRANT ALL ON public.streaks TO service_role;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own streak" ON public.streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- XP
-- =========================================
CREATE TABLE public.xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp TO authenticated;
GRANT ALL ON public.xp TO service_role;
ALTER TABLE public.xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp" ON public.xp FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- ACHIEVEMENTS catalog
-- =========================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INT NOT NULL DEFAULT 0,
  badge_emoji TEXT
);
GRANT SELECT ON public.achievements TO authenticated, anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements readable" ON public.achievements FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.achievements (code,title,description,xp_reward,badge_emoji) VALUES
  ('streak_7','7 day streak','Drink water 7 days in a row',100,'🔥'),
  ('streak_30','30 day streak','One month of hydration',300,'💎'),
  ('streak_90','90 day streak','Three months strong',700,'👑'),
  ('streak_365','365 day streak','A full year hydrated',2000,'🌟'),
  ('validations_100','100 validations','100 verified drinks',150,'📸'),
  ('validations_1000','1000 validations','1000 verified drinks',1000,'🏆'),
  ('volume_10000','10L consumed','10 liters total',100,'💧'),
  ('volume_100000','100L consumed','100 liters total',800,'🌊');

-- =========================================
-- USER ACHIEVEMENTS
-- =========================================
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_achievements" ON public.user_achievements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- DAILY FACTS
-- =========================================
CREATE TABLE public.daily_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_text TEXT NOT NULL,
  category TEXT
);
GRANT SELECT ON public.daily_facts TO authenticated, anon;
GRANT ALL ON public.daily_facts TO service_role;
ALTER TABLE public.daily_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facts readable" ON public.daily_facts FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.daily_facts (fact_text, category) VALUES
  ('Your brain is about 75% water — staying hydrated sharpens focus.', 'science'),
  ('Drinking water before a meal can reduce hunger and aid digestion.', 'health'),
  ('Mild dehydration of just 1-2% can impair mood and concentration.', 'science'),
  ('Adults are roughly 60% water by weight.', 'science'),
  ('Water regulates body temperature through sweating and breathing.', 'science'),
  ('Hydration helps your kidneys flush waste efficiently.', 'health'),
  ('Cold water can slightly boost metabolism for up to an hour.', 'health'),
  ('Athletes can lose 6-10% of body weight in sweat without water breaks.', 'sport'),
  ('Skin elasticity improves with consistent hydration.', 'health'),
  ('Headaches are one of the first signs of dehydration.', 'health'),
  ('Your blood is about 90% water.', 'science'),
  ('Hydration supports joint lubrication and reduces stiffness.', 'health'),
  ('Drinking enough water can improve workout performance by 25%.', 'sport'),
  ('Cells need water to produce energy from nutrients.', 'science'),
  ('Lungs are 83% water — they need it to breathe efficiently.', 'science'),
  ('A 1% drop in hydration lowers cognitive performance.', 'science'),
  ('Water has zero calories — the ultimate diet drink.', 'fun'),
  ('You lose about 2.5L of water per day, even at rest.', 'science'),
  ('Hot weather can double your daily water needs.', 'health'),
  ('Sipping slowly hydrates better than chugging large amounts.', 'tip');

-- =========================================
-- SUBSCRIPTIONS
-- =========================================
CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status public.subscription_status NOT NULL DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sub" ON public.subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================
-- LEADERBOARD SEED (mock competitors)
-- =========================================
CREATE TABLE public.leaderboard_seed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  league TEXT NOT NULL,
  points INT NOT NULL
);
GRANT SELECT ON public.leaderboard_seed TO authenticated, anon;
GRANT ALL ON public.leaderboard_seed TO service_role;
ALTER TABLE public.leaderboard_seed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaderboard readable" ON public.leaderboard_seed FOR SELECT TO authenticated, anon USING (true);

INSERT INTO public.leaderboard_seed (name, avatar, league, points) VALUES
  ('Marie L.','👸','diamond',15420),('Thomas B.','🧑‍💻','diamond',14890),('Sofia M.','💪','diamond',13200),
  ('Lucas P.','🏃','diamond',11340),('Emma R.','🧘','diamond',10980),('Noah K.','⚡','diamond',9870),
  ('Jade F.','🌟','diamond',8430),('Alex V.','🏊','diamond',7650),('Léa M.','🌈','diamond',6890),
  ('Hugo T.','🧑‍🎨','gold',5420),('Sara D.','🌺','gold',4890),('Max R.','🐬','gold',4200),
  ('Nina B.','🦋','silver',2890),('Tom L.','🐳','silver',2200),('Ana C.','🌷','silver',1890),
  ('Eva S.','🍃','bronze',890),('Joe M.','🐢','bronze',520),('Mia W.','🐠','bronze',310);

-- =========================================
-- TRIGGER: create profile / streak / xp on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  INSERT INTO public.xp (user_id) VALUES (NEW.id);
  INSERT INTO public.subscriptions (user_id, status) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- updated_at trigger
-- =========================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER streaks_touch BEFORE UPDATE ON public.streaks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER xp_touch BEFORE UPDATE ON public.xp FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER subs_touch BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
