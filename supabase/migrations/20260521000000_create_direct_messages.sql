-- Migration: Create Direct Chats and Direct Messages

-- Create direct_chats table
CREATE TABLE IF NOT EXISTS public.direct_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT direct_chats_participants_check CHECK (participant_1 < participant_2),
    UNIQUE(participant_1, participant_2)
);

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.direct_chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- RLS for direct_chats
ALTER TABLE public.direct_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats" 
ON public.direct_chats FOR SELECT 
TO authenticated
USING (
    participant_1 = auth.uid() OR participant_2 = auth.uid()
);

CREATE POLICY "Users can create chats if they are a participant" 
ON public.direct_chats FOR INSERT 
TO authenticated 
WITH CHECK (
    participant_1 = auth.uid() OR participant_2 = auth.uid()
);

CREATE POLICY "Users can update their own chats" 
ON public.direct_chats FOR UPDATE 
TO authenticated
USING (
    participant_1 = auth.uid() OR participant_2 = auth.uid()
);

-- RLS for direct_messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats" 
ON public.direct_messages FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.direct_chats
        WHERE id = direct_messages.chat_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
);

CREATE POLICY "Users can insert messages into their chats" 
ON public.direct_messages FOR INSERT 
TO authenticated 
WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.direct_chats
        WHERE id = chat_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
);

CREATE POLICY "Users can update their own messages" 
ON public.direct_messages FOR UPDATE 
TO authenticated
USING (
    sender_id = auth.uid()
);

-- Function to update updated_at in direct_chats
CREATE OR REPLACE FUNCTION update_direct_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.direct_chats
  SET updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_timestamp_trigger
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION update_direct_chat_timestamp();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_chats;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_direct_chats_p1 ON public.direct_chats(participant_1);
CREATE INDEX IF NOT EXISTS idx_direct_chats_p2 ON public.direct_chats(participant_2);
CREATE INDEX IF NOT EXISTS idx_direct_chats_updated_at ON public.direct_chats(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_chat_id ON public.direct_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages(created_at DESC);
