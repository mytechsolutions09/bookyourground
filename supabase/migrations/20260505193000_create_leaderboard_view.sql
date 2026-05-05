-- Create a comprehensive leaderboard view for Cricket
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
    p.id as profile_id,
    p.full_name, 
    p.avatar_url, 
    COALESCE(p.state, 'Unknown') as city,
    pbs.ball_type,
    -- Batting Stats
    pbs.innings_batted as inn,
    pbs.total_runs as runs,
    CASE 
        WHEN (pbs.innings_batted - pbs.not_outs) > 0 
        THEN ROUND(pbs.total_runs::numeric / (pbs.innings_batted - pbs.not_outs), 2)
        ELSE pbs.total_runs::numeric 
    END as avg,
    pbs.strike_rate as sr,
    -- Bowling Stats
    pbs.total_wickets as wickets,
    pbs.best_bowling_wickets,
    pbs.best_bowling_runs,
    -- Fielding Stats
    pbs.total_catches as catches,
    pbs.run_outs,
    pbs.stumpings,
    (pbs.total_catches + pbs.run_outs + pbs.stumpings) as fielding_points,
    -- Ranking
    RANK() OVER (PARTITION BY pbs.ball_type ORDER BY pbs.total_runs DESC) as batting_rank,
    RANK() OVER (PARTITION BY pbs.ball_type ORDER BY pbs.total_wickets DESC) as bowling_rank,
    RANK() OVER (PARTITION BY pbs.ball_type ORDER BY (pbs.total_catches + pbs.run_outs + pbs.stumpings) DESC) as fielding_rank
FROM public.player_ball_stats pbs
JOIN public.team_members tm ON pbs.member_id = tm.id
JOIN public.profiles p ON tm.profile_id = p.id;

-- Enable RLS on the view (if supported, otherwise ensure base tables are secured)
-- In Supabase/Postgres, views inherit RLS from base tables or can have their own policies.
-- Since base tables already have RLS, we're mostly good.
