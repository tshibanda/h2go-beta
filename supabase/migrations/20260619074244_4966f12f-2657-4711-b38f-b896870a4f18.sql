DROP POLICY IF EXISTS "own xp" ON public.xp;
CREATE POLICY "own xp read" ON public.xp FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own user_achievements" ON public.user_achievements;
CREATE POLICY "own user_achievements read" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own sub" ON public.subscriptions;
CREATE POLICY "own sub read" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users can update own hydration photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'hydration-photos' AND (auth.uid())::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'hydration-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);