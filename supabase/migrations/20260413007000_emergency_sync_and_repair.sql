-- 1. FIX SCHEMA (Add missing columns and make owner_id nullable for dev)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'initials') THEN
        ALTER TABLE public.teams ADD COLUMN initials TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'bg_color') THEN
        ALTER TABLE public.teams ADD COLUMN bg_color TEXT;
    END IF;

    -- Make owner_id nullable so mock teams can exist without a real profile
    ALTER TABLE public.teams ALTER COLUMN owner_id DROP NOT NULL;
END $$;

-- 2. RELAX SECURITY (Allow data management during development)
-- Team Members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
CREATE POLICY "Team members are viewable by everyone" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can add members during dev" ON public.team_members;
CREATE POLICY "Anyone can add members during dev" ON public.team_members FOR INSERT WITH CHECK (true);

-- Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teams are public during dev" ON public.teams;
CREATE POLICY "Teams are public during dev" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create teams during dev" ON public.teams;
CREATE POLICY "Anyone can create teams during dev" ON public.teams FOR INSERT WITH CHECK (true);

-- 3. SEED DATA (Ensure mock IDs work)
INSERT INTO public.teams (id, name, location, captain, initials, bg_color)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d47a', 'Ggn Titans', 'Haryana', 'Manu Yadav', 'GT', '#111827'),
('f47ac10b-58cc-4372-a567-0e02b2c3d47b', 'The Yankees', 'Delhi', 'Arpit Kanotra', 'TY', '#0EA5E9'),
('f47ac10b-58cc-4372-a567-0e02b2c3d47c', 'AHC Tigers', 'Delhi', 'Anshul', 'AT', '#F97316'),
('f47ac10b-58cc-4372-a567-0e02b2c3d47d', 'Crixcus XI', 'Delhi', 'Ashish Sharma', 'CX', '#F87171')
ON CONFLICT (id) DO UPDATE SET 
    initials = EXCLUDED.initials,
    bg_color = EXCLUDED.bg_color;
