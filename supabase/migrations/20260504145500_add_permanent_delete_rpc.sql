-- Function to allow super admins to permanently delete users from auth.users
-- This will trigger a cascade delete of the profile and all related data
CREATE OR REPLACE FUNCTION delete_user_permanently(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (admin)
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Verify the requester is a super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can perform permanent deletion.';
  END IF;

  -- 2. Prevent admins from deleting themselves accidentally
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Forbidden: You cannot delete your own account via this tool.';
  END IF;

  -- 3. Delete from auth.users
  -- This will cascade to public.profiles because of the FK constraint
  -- and from profiles to grounds, bookings, etc.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users
-- The internal logic handles the role check
GRANT EXECUTE ON FUNCTION delete_user_permanently(uuid) TO authenticated;
