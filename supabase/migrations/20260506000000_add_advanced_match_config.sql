-- Add advanced match configuration columns to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS powerplay_overs INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS wide_runs INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS no_ball_runs INTEGER DEFAULT 1;

-- Also ensure team_a and team_b (names) exist if they are being used in insert
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'team_a') THEN
        ALTER TABLE public.matches ADD COLUMN team_a TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'team_b') THEN
        ALTER TABLE public.matches ADD COLUMN team_b TEXT;
    END IF;
END $$;
