-- Add SEO and tag fields to blogs table
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS focus_keyphrase text,
ADD COLUMN IF NOT EXISTS seo_title text,
ADD COLUMN IF NOT EXISTS seo_description text,
ADD COLUMN IF NOT EXISTS tags text[] not null default '{}';
