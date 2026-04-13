-- Upgrade existing matches table and add new tables for live scoring
DO $$ 
BEGIN
    -- Add columns to matches if they don't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'owner_id') THEN
        ALTER TABLE matches ADD COLUMN owner_id UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'team_a') THEN
        ALTER TABLE matches ADD COLUMN team_a TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'team_b') THEN
        ALTER TABLE matches ADD COLUMN team_b TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'title') THEN
        ALTER TABLE matches ADD COLUMN title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'overs') THEN
        ALTER TABLE matches ADD COLUMN overs INT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'players') THEN
        ALTER TABLE matches ADD COLUMN players INT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'venue') THEN
        ALTER TABLE matches ADD COLUMN venue TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'toss_winner') THEN
        ALTER TABLE matches ADD COLUMN toss_winner TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'toss_choice') THEN
        ALTER TABLE matches ADD COLUMN toss_choice TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'matches' AND COLUMN_NAME = 'display_id') THEN
        ALTER TABLE matches ADD COLUMN display_id BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1);
    END IF;

    -- Drop the existing constraint if it exists
    ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
END $$;

-- innings table
CREATE TABLE IF NOT EXISTS public.innings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_number INT NOT NULL,
  batting_team TEXT NOT NULL,
  bowling_team TEXT NOT NULL,
  target INT,
  runs INT DEFAULT 0,
  wickets INT DEFAULT 0,
  legal_balls INT DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  batting_players JSONB DEFAULT '[]',
  bowling_players JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ball_log table
CREATE TABLE IF NOT EXISTS public.ball_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_id UUID REFERENCES public.innings(id) ON DELETE CASCADE,
  over_number INT NOT NULL,
  ball_number INT NOT NULL,
  runs INT DEFAULT 0,
  extras INT DEFAULT 0,
  extra_type TEXT,
  is_wicket BOOLEAN DEFAULT false,
  dismissal_type TEXT,
  batter_name TEXT,
  bowler_name TEXT,
  fielder_name TEXT,
  label TEXT,
  ball_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- match_live_state
CREATE TABLE IF NOT EXISTS public.match_live_state (
  match_id UUID PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  innings_number INT,
  batting_team TEXT,
  bowling_team TEXT,
  runs INT DEFAULT 0,
  wickets INT DEFAULT 0,
  legal_balls INT DEFAULT 0,
  overs_total INT,
  target INT,
  crr FLOAT DEFAULT 0,
  rrr FLOAT,
  striker_name TEXT,
  striker_runs INT DEFAULT 0,
  striker_balls INT DEFAULT 0,
  striker_fours INT DEFAULT 0,
  striker_sixes INT DEFAULT 0,
  nonstriker_name TEXT,
  nonstriker_runs INT DEFAULT 0,
  nonstriker_balls INT DEFAULT 0,
  nonstriker_fours INT DEFAULT 0,
  nonstriker_sixes INT DEFAULT 0,
  bowler_name TEXT,
  bowler_overs TEXT,
  bowler_runs INT DEFAULT 0,
  bowler_wickets INT DEFAULT 0,
  bowler_maidens INT DEFAULT 0,
  last_ball_label TEXT,
  last_ball_type TEXT,
  current_over_balls JSONB DEFAULT '[]',
  match_status TEXT,
  result_text TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'match_live_state'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE match_live_state;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'ball_log'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ball_log;
    END IF;
END $$;

-- RLS Aggressive Cleanup
DROP POLICY IF EXISTS "Public matches are viewable by everyone" ON matches;
DROP POLICY IF EXISTS "Authenticated users can create matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can update match details" ON matches;
DROP POLICY IF EXISTS "Public Read Matches V2" ON matches;
DROP POLICY IF EXISTS "Auth Insert Matches" ON matches;
DROP POLICY IF EXISTS "Auth Update Matches" ON matches;
DROP POLICY IF EXISTS "matches_permissive_select" ON matches;
DROP POLICY IF EXISTS "matches_permissive_insert" ON matches;
DROP POLICY IF EXISTS "matches_permissive_update" ON matches;
DROP POLICY IF EXISTS "matches_permissive_delete" ON matches;

DROP POLICY IF EXISTS "innings_permissive_select" ON public.innings;
DROP POLICY IF EXISTS "innings_permissive_insert" ON public.innings;
DROP POLICY IF EXISTS "innings_permissive_update" ON public.innings;
DROP POLICY IF EXISTS "ball_log_permissive_select" ON public.ball_log;
DROP POLICY IF EXISTS "ball_log_permissive_insert" ON public.ball_log;
DROP POLICY IF EXISTS "ball_log_permissive_update" ON public.ball_log;
DROP POLICY IF EXISTS "live_permissive_select" ON public.match_live_state;
DROP POLICY IF EXISTS "live_permissive_insert" ON public.match_live_state;
DROP POLICY IF EXISTS "live_permissive_update" ON public.match_live_state;
DROP POLICY IF EXISTS "match_images_permissive_select" ON public.match_images;
DROP POLICY IF EXISTS "match_images_permissive_insert" ON public.match_images;
DROP POLICY IF EXISTS "match_images_permissive_delete" ON public.match_images;
DROP POLICY IF EXISTS "match_gallery_view" ON storage.objects;
DROP POLICY IF EXISTS "match_gallery_insert" ON storage.objects;
DROP POLICY IF EXISTS "match_gallery_delete" ON storage.objects;

-- Global Permissive Policies
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_permissive_select" ON matches FOR SELECT USING (true);
CREATE POLICY "matches_permissive_insert" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "matches_permissive_update" ON matches FOR UPDATE USING (true);
CREATE POLICY "matches_permissive_delete" ON matches FOR DELETE USING (true);

ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "innings_permissive_select" ON public.innings FOR SELECT USING (true);
CREATE POLICY "innings_permissive_insert" ON public.innings FOR INSERT WITH CHECK (true);
CREATE POLICY "innings_permissive_update" ON public.innings FOR UPDATE USING (true);

ALTER TABLE public.ball_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ball_log_permissive_select" ON public.ball_log FOR SELECT USING (true);
CREATE POLICY "ball_log_permissive_insert" ON public.ball_log FOR INSERT WITH CHECK (true);
CREATE POLICY "ball_log_permissive_update" ON public.ball_log FOR UPDATE USING (true);

ALTER TABLE public.match_live_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_permissive_select" ON public.match_live_state FOR SELECT USING (true);
CREATE POLICY "live_permissive_insert" ON public.match_live_state FOR INSERT WITH CHECK (true);
CREATE POLICY "live_permissive_update" ON public.match_live_state FOR UPDATE USING (true);

-- Gallery Support
CREATE TABLE IF NOT EXISTS public.match_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.match_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_images_permissive_select" ON public.match_images FOR SELECT USING (true);
CREATE POLICY "match_images_permissive_insert" ON public.match_images FOR INSERT WITH CHECK (true);
CREATE POLICY "match_images_permissive_delete" ON public.match_images FOR DELETE USING (true);

-- Storage Setup for match-gallery
INSERT INTO storage.buckets (id, name, public) 
VALUES ('match-gallery', 'match-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "match_gallery_view" ON storage.objects FOR SELECT USING (bucket_id = 'match-gallery');
CREATE POLICY "match_gallery_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'match-gallery');
CREATE POLICY "match_gallery_delete" ON storage.objects FOR DELETE USING (bucket_id = 'match-gallery');
