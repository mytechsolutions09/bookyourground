-- Add Caught and Bowled (C.B) metric to the fielding stats section
-- This tracks catches taken by the bowler in their own follow-through

ALTER TABLE public.player_ball_stats
ADD COLUMN IF NOT EXISTS caught_and_bowled INTEGER DEFAULT 0;

COMMENT ON COLUMN public.player_ball_stats.caught_and_bowled IS 'Total count of "caught and bowled" dismissals credited to the player.';
