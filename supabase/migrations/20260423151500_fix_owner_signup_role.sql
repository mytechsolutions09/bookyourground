-- Fix for owner signup role: Ensure profiles are created with the correct role from metadata
-- instead of being hardcoded to 'user'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Safely parse the role from metadata, default to 'user' if invalid or missing
  BEGIN
    v_role := (new.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'user'::public.user_role;
  END;

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
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'team_name',
    new.raw_user_meta_data->>'player_type'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
