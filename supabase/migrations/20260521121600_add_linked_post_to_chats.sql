-- Migration: Add linked_post_id to direct_chats

ALTER TABLE public.direct_chats
ADD COLUMN linked_post_id UUID REFERENCES public.notice_board_posts(id) ON DELETE SET NULL;
