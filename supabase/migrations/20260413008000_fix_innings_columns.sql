-- Fix missing columns in innings table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'innings' AND COLUMN_NAME = 'batting_players') THEN
        ALTER TABLE public.innings ADD COLUMN batting_players JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'innings' AND COLUMN_NAME = 'bowling_players') THEN
        ALTER TABLE public.innings ADD COLUMN bowling_players JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'innings' AND COLUMN_NAME = 'legal_balls') THEN
        ALTER TABLE public.innings ADD COLUMN legal_balls INT DEFAULT 0;
    END IF;
END $$;

-- Create match_playing_xi table which was missing
CREATE TABLE IF NOT EXISTS public.match_playing_xi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(match_id, team_id, player_id)
);

-- Repair RLS for innings just in case
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "innings_permissive_all" ON public.innings;
CREATE POLICY "innings_permissive_all" ON public.innings FOR ALL USING (true) WITH CHECK (true);
-- RLS for match_playing_xi
ALTER TABLE public.match_playing_xi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "playing_xi_permissive_all" ON public.match_playing_xi;
CREATE POLICY "playing_xi_permissive_all" ON public.match_playing_xi FOR ALL USING (true) WITH CHECK (true);

-- Ensure match_live_state has all necessary columns for resumption
ALTER TABLE IF EXISTS public.match_live_state 
ADD COLUMN IF NOT EXISTS striker_name TEXT,
ADD COLUMN IF NOT EXISTS striker_runs INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS striker_balls INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS striker_fours INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS striker_sixes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS nonstriker_name TEXT,
ADD COLUMN IF NOT EXISTS nonstriker_runs INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS nonstriker_balls INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS nonstriker_fours INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS nonstriker_sixes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bowler_name TEXT,
ADD COLUMN IF NOT EXISTS bowler_overs TEXT,
ADD COLUMN IF NOT EXISTS bowler_runs INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bowler_wickets INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bowler_maidens INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ball_label TEXT,
ADD COLUMN IF NOT EXISTS last_ball_type TEXT,
ADD COLUMN IF NOT EXISTS current_over_balls JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS match_status TEXT,
ADD COLUMN IF NOT EXISTS result_text TEXT;

-- Maintenance for live state
DROP POLICY IF EXISTS "match_live_state_permissive_all" ON public.match_live_state;
CREATE POLICY "match_live_state_permissive_all" ON public.match_live_state FOR ALL USING (true) WITH CHECK (true);
