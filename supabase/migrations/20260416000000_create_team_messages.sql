-- Create team_messages table
CREATE TABLE IF NOT EXISTS public.team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Team members can view messages" ON public.team_messages;
CREATE POLICY "Team members can view messages" 
ON public.team_messages FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = team_messages.team_id 
        AND profile_id = auth.uid() 
        AND status = 'accepted'
    ) OR EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = team_messages.team_id
        AND owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Team members can insert messages" ON public.team_messages;
CREATE POLICY "Team members can insert messages" 
ON public.team_messages FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = team_id 
        AND profile_id = auth.uid() 
        AND status = 'accepted'
    ) OR EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = team_id
        AND owner_id = auth.uid()
    )
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON public.team_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_created_at ON public.team_messages(created_at);
