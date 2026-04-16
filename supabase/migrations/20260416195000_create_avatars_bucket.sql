-- migrations/20260416195000_create_avatars_bucket.sql
-- Create Storage Bucket for Player Avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for avatars
-- Allow public viewing
DROP POLICY IF EXISTS "avatars_public_view" ON storage.objects;
CREATE POLICY "avatars_public_view" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatar
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
