-- Add is_indexed and seo_score columns to sitemap_urls table
ALTER TABLE public.sitemap_urls ADD COLUMN IF NOT EXISTS is_indexed boolean DEFAULT true;
ALTER TABLE public.sitemap_urls ADD COLUMN IF NOT EXISTS seo_score integer DEFAULT 100;
