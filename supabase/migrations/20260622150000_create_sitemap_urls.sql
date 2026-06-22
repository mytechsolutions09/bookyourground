-- Create sitemap urls table
CREATE TABLE IF NOT EXISTS public.sitemap_urls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    url text UNIQUE NOT NULL,
    priority numeric DEFAULT 0.8,
    changefreq text DEFAULT 'weekly',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.sitemap_urls ENABLE ROW LEVEL SECURITY;

-- Allow public read access (including anon) to everyone
CREATE POLICY "Allow public read to sitemap urls"
ON public.sitemap_urls FOR SELECT
USING (true);

-- Allow super admins full access to write/modify
CREATE POLICY "Super admins have full access to sitemap urls"
ON public.sitemap_urls FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);

-- Grant select to anon and authenticated
GRANT SELECT ON TABLE public.sitemap_urls TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sitemap_urls TO authenticated;
