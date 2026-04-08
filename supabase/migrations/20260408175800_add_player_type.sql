-- Add player_type to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS player_type TEXT;

-- Update the handle_new_user trigger function to include player_type from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    role,
    phone,
    business_name,
    address,
    state,
    team_name,
    player_type
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.user_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'team_name',
    NEW.raw_user_meta_data->>'player_type'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
