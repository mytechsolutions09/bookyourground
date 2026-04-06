-- Allow super admins and the admin override email to see all grounds regardless of status.
DROP POLICY IF EXISTS "Super admins can select all grounds" ON grounds;

CREATE POLICY "Super admins can select all grounds"
  ON grounds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  );
