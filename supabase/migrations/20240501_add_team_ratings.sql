-- Migration: Add Team Rating and Skill Level System
-- Description: Updates the teams table and creates a team_ratings table for matchmaking.

-- 1. Update teams table to store current stats
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'Amateur',
ADD COLUMN IF NOT EXISTS total_matches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0;

-- 2. Create a comment for the new columns
COMMENT ON COLUMN public.teams.rating IS 'Current average rating of the team (0.00 to 5.00)';
COMMENT ON COLUMN public.teams.skill_level IS 'Categorical skill level (Amateur, Semi-Pro, Competitive, Pro)';

-- 3. Create team_ratings table for granular feedback
CREATE TABLE IF NOT EXISTS public.team_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    rated_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    rater_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    fair_play_score INTEGER CHECK (fair_play_score >= 1 AND fair_play_score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a team can only rate an opponent once per match
    UNIQUE(match_id, rated_team_id, rater_team_id)
);

-- 4. Function to update team average rating automatically
CREATE OR REPLACE FUNCTION update_team_average_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.teams
    SET rating = (
        SELECT AVG(rating)::NUMERIC(3,2)
        FROM public.team_ratings
        WHERE rated_team_id = NEW.rated_team_id
    )
    WHERE id = NEW.rated_team_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to invoke the rating update
CREATE TRIGGER tr_update_team_rating
AFTER INSERT OR UPDATE ON public.team_ratings
FOR EACH ROW
EXECUTE FUNCTION update_team_average_rating();

-- 6. Seed some initial data for existing teams (Optional)
UPDATE public.teams SET skill_level = 'Pro', rating = 4.8 WHERE name ILIKE '%Titans%';
UPDATE public.teams SET skill_level = 'Semi-Pro', rating = 4.2 WHERE name ILIKE '%Tigers%';

-- 7. Security: Enable RLS and add policies
ALTER TABLE public.team_ratings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read ratings
CREATE POLICY "Allow public read access for team ratings"
ON public.team_ratings FOR SELECT
USING (true);

-- Allow authenticated users to insert ratings
CREATE POLICY "Allow authenticated users to insert ratings"
ON public.team_ratings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Optional: Restrict update/delete to the rater only
CREATE POLICY "Allow raters to update their own ratings"
ON public.team_ratings FOR UPDATE
TO authenticated
USING (auth.uid() IN (
    SELECT owner_id FROM public.teams WHERE id = rater_team_id
));

