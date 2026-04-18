-- Add views_count to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Create function to increment views
CREATE OR REPLACE FUNCTION public.increment_profile_views(target_profile_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET views_count = views_count + 1
    WHERE id = target_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
