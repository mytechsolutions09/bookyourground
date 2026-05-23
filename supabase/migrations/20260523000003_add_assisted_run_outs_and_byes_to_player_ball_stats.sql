-- Migration to add assisted_run_outs and byes_conceded columns to player_ball_stats and update leaderboard view
ALTER TABLE public.player_ball_stats
ADD COLUMN IF NOT EXISTS assisted_run_outs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS byes_conceded INTEGER DEFAULT 0;

COMMENT ON COLUMN public.player_ball_stats.assisted_run_outs IS 'Number of run outs assisted by this player (e.g. throws/assists).';
COMMENT ON COLUMN public.player_ball_stats.byes_conceded IS 'Number of byes conceded by the player (typically while keeping).';

DROP VIEW IF EXISTS public.leaderboard;
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
    pbs.id,
    tm.id as member_id,
    p.serial_id as display_id,
    tm.player_name as full_name, 
    p.avatar_url, 
    COALESCE(p.state, 'Unknown') as city,
    pbs.ball_type,
    -- Batting
    pbs.matches_played,
    pbs.innings_batted,
    pbs.not_outs,
    pbs.total_runs,
    pbs.highest_score,
    pbs.strike_rate,
    pbs.hundreds,
    pbs.fifties,
    pbs.ducks,
    pbs.matches_won,
    pbs.matches_lost,
    -- Bowling
    pbs.innings_bowled,
    pbs.overs_bowled,
    pbs.total_wickets,
    pbs.best_bowling_wickets,
    pbs.best_bowling_runs,
    pbs.three_wicket_hauls,
    pbs.five_wicket_hauls,
    pbs.dot_balls_bowled,
    pbs.wides_conceded,
    pbs.no_balls_conceded,
    pbs.economy_rate,
    -- Fielding
    pbs.total_catches,
    pbs.caught_and_bowled,
    pbs.run_outs,
    pbs.stumpings,
    pbs.assisted_run_outs,
    pbs.byes_conceded,
    -- Captaincy
    pbs.matches_captained,
    pbs.matches_won_as_captain,
    pbs.matches_lost_as_captain,
    pbs.matches_tied_as_captain,
    pbs.matches_abandoned_as_captain
FROM public.player_ball_stats pbs
JOIN public.team_members tm ON pbs.member_id = tm.id
LEFT JOIN public.profiles p ON tm.profile_id = p.id;

-- Allow authenticated users to manage player_ball_stats (INSERT, UPDATE, DELETE, SELECT)
DROP POLICY IF EXISTS "Anyone can manage player ball stats" ON public.player_ball_stats;
CREATE POLICY "Anyone can manage player ball stats" 
ON public.player_ball_stats FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);
