/*
  Allow super admin (email override) to manage grounds and time_slots.

  Reason:
  - App routing treats `invirtualcoin@gmail.com` as super admin.
  - Some RLS policies depend on `profiles.role = 'super_admin'`.
  - If the profile role is missing/misconfigured, the UI still loads but inserts/updates can fail.

  This migration adds additive RLS policies that grant access when JWT email matches
  `invirtualcoin@gmail.com` regardless of `profiles.role`.
*/

-- Grounds: INSERT
CREATE POLICY "Super admin by email can insert grounds"
  ON grounds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  );

-- Grounds: UPDATE
CREATE POLICY "Super admin by email can update grounds"
  ON grounds
  FOR UPDATE
  TO authenticated
  USING (
    lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  )
  WITH CHECK (
    lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  );

-- Grounds: DELETE
CREATE POLICY "Super admin by email can delete grounds"
  ON grounds
  FOR DELETE
  TO authenticated
  USING (
    lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  );

-- Time slots: INSERT/UPDATE/SELECT/DELETE
CREATE POLICY "Super admin by email can manage time_slots"
  ON time_slots
  FOR ALL
  TO authenticated
  USING (
    lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  )
  WITH CHECK (
    lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  );

-- Ground images: allow super admin by email to manage media while creating/editing grounds.
CREATE POLICY "Super admin by email can manage ground_images"
  ON ground_images
  FOR ALL
  TO authenticated
  USING (
    lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  )
  WITH CHECK (
    lower(auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
  );

