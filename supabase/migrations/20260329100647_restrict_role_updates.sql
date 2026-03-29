/*
  # Restrict Role Updates to Super Admins Only

  ## Changes
  - Drop the existing update policy for profiles that allows users to update their own profiles
  - Create new policies that restrict role changes to super admins only
  - Allow users to update their other profile fields but not the role field

  ## Security
  - Only super admins can change user roles
  - Users can update their own profile information (name, phone, etc.) but not their role
*/

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new update policy for super admins (can update anything)
CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Create new update policy for regular users (cannot update role)
CREATE POLICY "Users can update own profile except role"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );