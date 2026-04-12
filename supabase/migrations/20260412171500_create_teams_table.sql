-- Enable pg_trgm extension for fuzzy searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    captain TEXT NOT NULL,
    initials TEXT,
    bg_color TEXT,
    image_url TEXT,
    is_user_team BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT unique_team_name_per_owner UNIQUE (owner_id, name)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by everyone" 
ON public.teams FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
CREATE POLICY "Users can create their own teams" 
ON public.teams FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
CREATE POLICY "Users can update their own teams" 
ON public.teams FOR UPDATE 
TO authenticated
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own teams" ON public.teams;
CREATE POLICY "Users can delete their own teams" 
ON public.teams FOR DELETE 
TO authenticated
USING (auth.uid() = owner_id);

-- Triggers
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_owner ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_name_trgm ON public.teams USING gin (name gin_trgm_ops);

-- Create Storage Bucket for Team Logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for team-logos
DROP POLICY IF EXISTS "team_logos_public_view" ON storage.objects;
CREATE POLICY "team_logos_public_view" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'team-logos');

DROP POLICY IF EXISTS "team_logos_owner_insert" ON storage.objects;
CREATE POLICY "team_logos_owner_insert" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'team-logos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "team_logos_owner_update" ON storage.objects;
CREATE POLICY "team_logos_owner_update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'team-logos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "team_logos_owner_delete" ON storage.objects;
CREATE POLICY "team_logos_owner_delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'team-logos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
