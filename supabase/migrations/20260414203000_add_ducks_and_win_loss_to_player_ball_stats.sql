-- Add Ducks, Team Wins, and Team Losses to the partitioned player stats
-- These help track both individual failures and team success participation

ALTER TABLE public.player_ball_stats
ADD COLUMN IF NOT EXISTS ducks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_won INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_lost INTEGER DEFAULT 0;

-- Adding column comments for clarity
COMMENT ON COLUMN public.player_ball_stats.ducks IS 'Count of innings where the player was dismissed for zero runs.';
COMMENT ON COLUMN public.player_ball_stats.matches_won IS 'Number of matches where the player was part of the winning team for this specific ball type.';
COMMENT ON COLUMN public.player_ball_stats.matches_lost IS 'Number of matches where the player was part of the losing team for this specific ball type.';
