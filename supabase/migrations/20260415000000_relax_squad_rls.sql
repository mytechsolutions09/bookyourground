-- Relax RLS for team_members to allow scorers to add players to teams during matches
-- This ensures that "Add New Batter" results in a permanent addition to the team's squad

-- 1. team_members
DROP POLICY IF EXISTS "Team owners can manage members" ON public.team_members;
CREATE POLICY "Anyone can manage team members" 
ON public.team_members FOR ALL 
USING (true)
WITH CHECK (true);

-- Ensure public viewings are also enabled
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
CREATE POLICY "Anyone can view team members" 
ON public.team_members FOR SELECT 
USING (true);

-- 2. profiles (Allow creating basic profiles for guest players if needed)
-- Note: inserting profiles usually requires auth.users, but for guest 'names' we stay in team_members
