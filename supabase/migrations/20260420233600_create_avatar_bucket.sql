-- Migration: Create bucket for profile avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for profile-avatars
-- 1. Restrict SELECT to owner only (prevents broad listing while keeping files public via bucket URL)
DROP POLICY IF EXISTS "Users can select own avatars" ON storage.objects;
CREATE POLICY "Users can select own avatars" ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile-avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Authenticated users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-avatars' AND 
  auth.role() = 'authenticated'
);

-- 3. Users can update/delete their own avatar
DROP POLICY IF EXISTS "Users can manage own avatars" ON storage.objects;
CREATE POLICY "Users can manage own avatars" ON storage.objects FOR ALL
USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
