-- Migration to populate player_ball_stats from existing ball_log data
-- and fix the leaderboard view to be more permissive

-- 1. Function to sync stats from ball_log
CREATE OR REPLACE FUNCTION public.sync_player_ball_stats()
RETURNS void AS $$
BEGIN
    -- Clear existing stats to avoid duplicates or stale data during full sync
    -- (In production, you'd use a more surgical incremental update)
    DELETE FROM public.player_ball_stats;

    -- Batting Stats Aggregation
    INSERT INTO public.player_ball_stats (member_id, ball_type, matches_played, innings_batted, total_runs, fours_hit, sixes_hit, balls_faced)
    SELECT 
        tm.id as member_id,
        m.ball_type,
        COUNT(DISTINCT m.id) as matches_played,
        COUNT(DISTINCT bl.innings_id) as innings_batted,
        SUM(bl.runs) as total_runs,
        COUNT(*) FILTER (WHERE bl.runs = 4) as fours_hit,
        COUNT(*) FILTER (WHERE bl.runs = 6) as sixes_hit,
        COUNT(*) FILTER (WHERE bl.extra_type IS NULL OR bl.extra_type != 'wide') as balls_faced
    FROM public.ball_log bl
    JOIN public.matches m ON bl.match_id = m.id
    JOIN public.team_members tm ON (bl.batter_name = tm.player_name)
    WHERE (tm.team_id = m.team_a_id OR tm.team_id = m.team_b_id OR tm.team_id IN (SELECT id FROM teams WHERE name = m.team_a OR name = m.team_b))
    GROUP BY tm.id, m.ball_type
    ON CONFLICT (member_id, ball_type) DO UPDATE SET
        matches_played = EXCLUDED.matches_played,
        innings_batted = EXCLUDED.innings_batted,
        total_runs = EXCLUDED.total_runs,
        fours_hit = EXCLUDED.fours_hit,
        sixes_hit = EXCLUDED.sixes_hit,
        balls_faced = EXCLUDED.balls_faced;

    -- Bowling Stats Aggregation
    INSERT INTO public.player_ball_stats (member_id, ball_type, total_wickets, runs_conceded, overs_bowled)
    SELECT 
        tm.id as member_id,
        m.ball_type,
        COUNT(*) FILTER (WHERE bl.is_wicket = true AND bl.dismissal_type NOT IN ('run out', 'retired hurt')) as total_wickets,
        SUM(bl.runs + bl.extras) as runs_conceded,
        ROUND((COUNT(*) FILTER (WHERE bl.extra_type IS NULL OR bl.extra_type NOT IN ('wide', 'no ball')) / 6.0)::numeric, 1) as overs_bowled
    FROM public.ball_log bl
    JOIN public.matches m ON bl.match_id = m.id
    JOIN public.team_members tm ON (bl.bowler_name = tm.player_name)
    WHERE (tm.team_id = m.team_a_id OR tm.team_id = m.team_b_id OR tm.team_id IN (SELECT id FROM teams WHERE name = m.team_a OR name = m.team_b))
    GROUP BY tm.id, m.ball_type
    ON CONFLICT (member_id, ball_type) DO UPDATE SET
        total_wickets = COALESCE(public.player_ball_stats.total_wickets, 0) + EXCLUDED.total_wickets,
        runs_conceded = COALESCE(public.player_ball_stats.runs_conceded, 0) + EXCLUDED.runs_conceded,
        overs_bowled = COALESCE(public.player_ball_stats.overs_bowled, 0) + EXCLUDED.overs_bowled;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Run the sync immediately
SELECT public.sync_player_ball_stats();

-- 3. Fix the leaderboard view to use LEFT JOIN for profiles (so players without linked profiles still show up)
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
    -- Captaincy
    pbs.matches_captained,
    pbs.matches_won_as_captain,
    pbs.matches_lost_as_captain,
    pbs.matches_tied_as_captain,
    pbs.matches_abandoned_as_captain
FROM public.player_ball_stats pbs
JOIN public.team_members tm ON pbs.member_id = tm.id
LEFT JOIN public.profiles p ON tm.profile_id = p.id;
