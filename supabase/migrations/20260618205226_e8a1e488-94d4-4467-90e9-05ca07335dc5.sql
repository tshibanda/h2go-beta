
-- touch_updated_at: add search_path, restrict
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Storage policies for hydration-photos bucket (private)
CREATE POLICY "users can read own hydration photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'hydration-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users can upload own hydration photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hydration-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users can delete own hydration photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hydration-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
