-- Create views for player insights
-- These views aggregate ball_log data to provide per-match performance metrics

-- Batting Insights View
CREATE OR REPLACE VIEW public.player_match_batting_stats AS
SELECT 
    m.id AS match_id,
    i.id AS innings_id,
    m.created_at,
    m.title AS match_title,
    m.team_a,
    m.team_b,
    bl.batter_name AS player_name,
    p.id AS profile_id,
    COALESCE(SUM(bl.runs), 0) AS runs,
    COUNT(bl.id) FILTER (WHERE bl.extra_type IS NULL OR bl.extra_type != 'wide') AS balls,
    COUNT(bl.id) FILTER (WHERE bl.runs = 4) AS fours,
    COUNT(bl.id) FILTER (WHERE bl.runs = 6) AS sixes,
    EXISTS (
        SELECT 1 FROM public.ball_log bl2 
        WHERE bl2.match_id = m.id 
        AND bl2.innings_id = i.id 
        AND bl2.is_wicket = true 
        AND bl2.batter_name = bl.batter_name
    ) AS is_out,
    (
        SELECT bl3.dismissal_type FROM public.ball_log bl3 
        WHERE bl3.match_id = m.id 
        AND bl3.innings_id = i.id 
        AND bl3.is_wicket = true 
        AND bl3.batter_name = bl.batter_name
        LIMIT 1
    ) AS dismissal_type,
    m.overs AS match_overs
FROM public.ball_log bl
JOIN public.matches m ON bl.match_id = m.id
JOIN public.innings i ON bl.innings_id = i.id
-- Join with profiles via team_members
LEFT JOIN public.team_members tm ON tm.player_name = bl.batter_name
LEFT JOIN public.profiles p ON tm.profile_id = p.id
GROUP BY m.id, i.id, m.created_at, m.title, m.team_a, m.team_b, bl.batter_name, p.id, m.overs;

-- Bowling Insights View
CREATE OR REPLACE VIEW public.player_match_bowling_stats AS
SELECT 
    m.id AS match_id,
    i.id AS innings_id,
    m.created_at,
    m.title AS match_title,
    m.team_a,
    m.team_b,
    bl.bowler_name AS player_name,
    p.id AS profile_id,
    COALESCE(SUM(bl.runs), 0) + COALESCE(SUM(bl.extras) FILTER (WHERE bl.extra_type IN ('wide', 'noball')), 0) AS runs_conceded,
    COUNT(bl.id) FILTER (WHERE bl.extra_type IS NULL OR bl.extra_type NOT IN ('wide', 'noball')) AS legal_balls,
    COUNT(bl.id) FILTER (WHERE bl.is_wicket = true AND bl.dismissal_type NOT IN ('run_out', 'retired_hurt', 'timed_out')) AS wickets,
    m.overs AS match_overs
FROM public.ball_log bl
JOIN public.matches m ON bl.match_id = m.id
JOIN public.innings i ON bl.innings_id = i.id
-- Join with profiles via team_members
LEFT JOIN public.team_members tm ON tm.player_name = bl.bowler_name
LEFT JOIN public.profiles p ON tm.profile_id = p.id
GROUP BY m.id, i.id, m.created_at, m.title, m.team_a, m.team_b, bl.bowler_name, p.id, m.overs;

-- RLS for the views (Supabase views inherit RLS from underlying tables, but it's good to be explicit if needed)
-- Note: In Supabase, you don't usually set RLS on views directly, but on the tables they reference.
