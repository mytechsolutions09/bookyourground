-- Add charge_platform_fee column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS charge_platform_fee BOOLEAN DEFAULT TRUE;

-- Update RLS policies to allow super admins to update this column
-- (Profiles table usually already has policies, but we ensure super admins can manage everything)
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
CREATE POLICY "Super admins can update all profiles" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
