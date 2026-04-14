-- Add comprehensive bowling metrics to player_ball_stats
-- Aligned with professional cricket analytics standards

ALTER TABLE public.player_ball_stats
ADD COLUMN IF NOT EXISTS three_wicket_hauls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wides_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_balls_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dot_balls_bowled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fours_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sixes_conceded INTEGER DEFAULT 0;

-- Adding column comments
COMMENT ON COLUMN public.player_ball_stats.three_wicket_hauls IS 'Count of innings where the player took 3 wickets.';
COMMENT ON COLUMN public.player_ball_stats.dot_balls_bowled IS 'Total number of legal deliveries where no runs were scored.';
