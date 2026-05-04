-- Add policy to allow super admins to delete any profile
DROP POLICY IF EXISTS "Super admins can delete any profile" ON profiles;
CREATE POLICY "Super admins can delete any profile" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
