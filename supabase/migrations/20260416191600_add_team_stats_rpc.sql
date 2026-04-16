-- Function to calculate comprehensive team statistics in a single call
-- This avoids heavy client-side processing for teams with many matches

CREATE OR REPLACE FUNCTION get_team_stats(target_team_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH team_matches AS (
        -- Get all matches the team participated in
        SELECT 
            m.*,
            ls.winner_id,
            ls.match_status as live_status
        FROM matches m
        LEFT JOIN match_live_state ls ON ls.match_id = m.id
        WHERE m.team_a_id = target_team_id OR m.team_b_id = target_team_id
    ),
    innings_stats AS (
        -- Calculate runs for and against
        -- This join handles identifying the team's innings based on match metadata
        -- (Assumes innings 1 is team A if they bat first, etc.)
        -- For simplicity, we'll use a subquery to match team names or IDs if we add them
        SELECT 
            match_id,
            SUM(CASE WHEN (
                (m.team_a_id = target_team_id AND i.innings_number = 1 AND (
                    (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bat') OR 
                    (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bowl')
                )) OR
                (m.team_a_id = target_team_id AND i.innings_number = 2 AND (
                    (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bowl') OR 
                    (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bat')
                )) OR
                (m.team_b_id = target_team_id AND i.innings_number = 1 AND (
                    (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bat') OR 
                    (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bowl')
                )) OR
                (m.team_b_id = target_team_id AND i.innings_number = 2 AND (
                    (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bowl') OR 
                    (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bat')
                ))
            ) THEN i.runs ELSE 0 END) as runs_for,
            SUM(CASE WHEN (
                (m.team_a_id = target_team_id AND i.innings_number = 1 AND (
                    (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bat') OR 
                    (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bowl')
                )) OR
                -- ... and so on for all permutations
                -- Actually simpler: if runs_for wasn't this, and it's this match, it's runs_against
                -- But wait, there are only 2 teams. So if it's NOT target_team_id's runs, it's against.
                -- Let's use the inverse logic
                NOT (
                    (m.team_a_id = target_team_id AND i.innings_number = 1 AND (
                        (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bat') OR 
                        (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bowl')
                    )) OR
                    (m.team_a_id = target_team_id AND i.innings_number = 2 AND (
                        (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bowl') OR 
                        (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bat')
                    )) OR
                    (m.team_b_id = target_team_id AND i.innings_number = 1 AND (
                        (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bat') OR 
                        (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bowl')
                    )) OR
                    (m.team_b_id = target_team_id AND i.innings_number = 2 AND (
                        (m.toss_winner_id = m.team_b_id AND m.toss_decision = 'bowl') OR 
                        (m.toss_winner_id = m.team_a_id AND m.toss_decision = 'bat')
                    ))
                )
            ) THEN i.runs ELSE 0 END) as runs_ag
        FROM innings i
        JOIN matches m ON m.id = i.match_id
        WHERE m.team_a_id = target_team_id OR m.team_b_id = target_team_id
        GROUP BY match_id
    )
    SELECT json_build_object(
        'matches', COUNT(*) FILTER (WHERE status != 'scheduled'),
        'upcoming', COUNT(*) FILTER (WHERE status = 'scheduled'),
        'won', COUNT(*) FILTER (WHERE winner_id = target_team_id),
        'lost', COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id != target_team_id),
        'tie', COUNT(*) FILTER (WHERE live_status = 'tie'),
        'draw', COUNT(*) FILTER (WHERE live_status = 'draw'),
        'no_result', COUNT(*) FILTER (WHERE status = 'abandoned' OR live_status = 'abandoned'),
        'toss_won', COUNT(*) FILTER (WHERE toss_winner_id = target_team_id),
        'bat_first', COUNT(*) FILTER (WHERE 
            (toss_winner_id = target_team_id AND toss_decision = 'bat') OR 
            (toss_winner_id != target_team_id AND toss_decision = 'bowl')
        ),
        'field_first', COUNT(*) FILTER (WHERE 
            (toss_winner_id = target_team_id AND toss_decision = 'bowl') OR 
            (toss_winner_id != target_team_id AND toss_decision = 'bat')
        ),
        'runs_for', COALESCE((SELECT SUM(runs_for) FROM innings_stats), 0),
        'runs_against', COALESCE((SELECT SUM(runs_ag) FROM innings_stats), 0),
        'highest_score', COALESCE((SELECT MAX(runs_for) FROM innings_stats), 0),
        'lowest_score', COALESCE((SELECT MIN(runs_for) FILTER (WHERE runs_for > 0) FROM innings_stats), 0),
        'points', (
            COUNT(*) FILTER (WHERE winner_id = target_team_id) * 2 +
            COUNT(*) FILTER (WHERE live_status IN ('tie', 'draw', 'abandoned')) * 1
        )
    ) INTO result
    FROM team_matches;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
