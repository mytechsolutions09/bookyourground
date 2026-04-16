-- migrations/20260416194700_add_styles_to_profiles.sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS batting_style TEXT,
ADD COLUMN IF NOT EXISTS bowling_style TEXT;
