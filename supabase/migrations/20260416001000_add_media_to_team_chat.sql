-- Create team-chat-media storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-chat-media', 'team-chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for team-chat-media
-- Anyone authenticated can upload if they are a member of a team (checked via app logic, but here we simplify to authenticated)
DROP POLICY IF EXISTS "Team chat media upload" ON storage.objects;
CREATE POLICY "Team chat media upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'team-chat-media');

DROP POLICY IF EXISTS "Team chat media view" ON storage.objects;
CREATE POLICY "Team chat media view" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'team-chat-media');

-- Note: Auto-deletion after 24 hours would typically be handled by a Supabase Edge Function cron job.
-- Since we are not saving a DB row for these, we depend on the Storage cleanup.
