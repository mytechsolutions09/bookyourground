-- Create profiles_follows table
CREATE TABLE IF NOT EXISTS public.profiles_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.profiles_follows ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view follows" 
ON public.profiles_follows FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can manage their own follows" 
ON public.profiles_follows FOR ALL 
TO authenticated 
USING (auth.uid() = follower_id) 
WITH CHECK (auth.uid() = follower_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.profiles_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.profiles_follows(following_id);
