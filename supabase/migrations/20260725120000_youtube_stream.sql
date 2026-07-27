-- YouTube Live streaming columns for matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS youtube_stream_url TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS youtube_stream_key TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS youtube_rtmp_url TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS stream_started_at TIMESTAMPTZ;

-- Per-owner YouTube OAuth tokens (stored on profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_token_expiry TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_channel_title TEXT;
