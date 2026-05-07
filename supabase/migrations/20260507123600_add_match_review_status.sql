-- Add is_under_review column to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS is_under_review BOOLEAN DEFAULT false;
