-- Migration: Allow marking messages as read

-- 1. Drop the restrictive UPDATE policy that only allowed the sender to update
DROP POLICY IF EXISTS "Users can update their own messages" ON public.direct_messages;

-- 2. Create a new policy that allows users to update messages if they are a participant in the chat
-- We are allowing this specifically so the receiver can update `is_read = true` on the sender's messages.
CREATE POLICY "Users can update messages in their chats" 
ON public.direct_messages FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.direct_chats
        WHERE id = direct_messages.chat_id
        AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
);
