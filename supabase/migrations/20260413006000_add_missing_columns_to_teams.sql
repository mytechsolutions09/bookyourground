-- Add missing columns to existing teams table
-- Using ALter Table because the original migration might have already been applied

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'initials') THEN
        ALTER TABLE public.teams ADD COLUMN initials TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'bg_color') THEN
        ALTER TABLE public.teams ADD COLUMN bg_color TEXT;
    END IF;
END $$;
