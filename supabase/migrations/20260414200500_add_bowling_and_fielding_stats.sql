-- Extend team_members table with granular bowling and fielding statistics
-- This supports the full Stats Hub (Batting, Bowling, Fielding)

ALTER TABLE public.team_members
-- Bowling Stats
ADD COLUMN IF NOT EXISTS innings_bowled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overs_bowled DECIMAL(5,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS maidens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS runs_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS five_wicket_hauls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_bowling_wickets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_bowling_runs INTEGER DEFAULT 0,

-- Fielding Stats
ADD COLUMN IF NOT EXISTS run_outs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stumpings INTEGER DEFAULT 0,

-- Verification columns (optional but helpful)
ADD COLUMN IF NOT EXISTS is_verified_player BOOLEAN DEFAULT false;
