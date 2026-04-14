-- Extend team_members table with granular batting statistics
-- This supports the detailed player performance dashboard

ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS innings_batted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS not_outs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS highest_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thirties INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fifties INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hundreds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fours_hit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sixes_hit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS balls_faced INTEGER DEFAULT 0;

-- Adding helpful comment
COMMENT ON TABLE public.team_members IS 'Stores both membership info and aggregated performance stats for players within teams.';
