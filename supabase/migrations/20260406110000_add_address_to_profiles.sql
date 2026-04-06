-- Add address and state to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS state text;

-- Update handle_new_user function to sync more metadata with absolute robustness
-- Using public schema qualification for all custom types and tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role public.user_role;
  v_full_name text;
BEGIN
  -- 1. Safely determine the role (default to 'user' if invalid or missing)
  BEGIN
    v_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'user'::public.user_role);
  EXCEPTION WHEN OTHERS THEN
    v_role := 'user'::public.user_role;
  END;

  -- 2. Safely determine full name
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'User');

  -- 3. Perform the insert with conflict handling
  INSERT INTO public.profiles (
    id, 
    full_name, 
    role, 
    phone, 
    address, 
    state,
    business_name,
    updated_at
  )
  VALUES (
    new.id, 
    v_full_name, 
    v_role,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'state',
    new.raw_user_meta_data->>'business_name',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    state = EXCLUDED.state,
    business_name = EXCLUDED.business_name,
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


