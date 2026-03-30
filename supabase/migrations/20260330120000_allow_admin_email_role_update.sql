/*
  Allow role updates for a specific admin email override.

  Reason:
  The app treats `invirtualcoin@gmail.com` as admin via UI routing,
  but RLS policy "Super admins can update any profile" previously
  only allowed users whose `profiles.role = super_admin`.

  This migration extends that policy so the email override can update
  the `role` field too.
*/

-- Extend the existing policy to allow role updates if auth jwt email matches.
DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;

CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  );

