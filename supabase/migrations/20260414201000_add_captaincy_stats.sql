-- Extend team_members table with captaincy performance statistics
-- This supports the Captaincy Leaderboard in the Stats Hub

ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS matches_captained INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won_as_captain INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_lost_as_captain INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_tied_as_captain INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_abandoned_as_captain INTEGER DEFAULT 0;

-- Adding helpful comment
COMMENT ON COLUMN public.team_members.matches_won_as_captain IS 'Aggregate count of matches won by this player while acting as the team captain.';
