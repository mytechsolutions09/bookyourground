-- Seed file to ensure mock teams exist and RLS is permissive for testing
-- This avoids "foreign key" and "policy" errors during initial setup/testing

-- Insert Mock Teams if they don't exist
INSERT INTO public.teams (id, name, location, captain, initials, bg_color, owner_id)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d47a', 'Ggn Titans', 'Haryana', 'Manu Yadav', 'GT', '#111827', auth.uid()),
('f47ac10b-58cc-4372-a567-0e02b2c3d47b', 'The Yankees', 'Delhi', 'Arpit Kanotra', 'TY', '#0EA5E9', auth.uid()),
('f47ac10b-58cc-4372-a567-0e02b2c3d47c', 'AHC Tigers', 'Delhi', 'Anshul', 'AT', '#F97316', auth.uid()),
('f47ac10b-58cc-4372-a567-0e02b2c3d47d', 'Crixcus XI', 'Delhi', 'Ashish Sharma', 'CX', '#F87171', auth.uid())
ON CONFLICT (id) DO NOTHING;

-- Relax RLS policies for team_members to avoid Blockers during development
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
CREATE POLICY "Team members are viewable by everyone" 
ON public.team_members FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Anyone can add members during dev" ON public.team_members;
CREATE POLICY "Anyone can add members during dev" 
ON public.team_members FOR INSERT 
WITH CHECK (true);

-- Ensure profiles exist if needed by team members (optional)
-- This assumes standard Supabase auth.users() might be empty, so we skip profile_id requirement
