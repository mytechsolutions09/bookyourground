-- Make Grounds, Images, Time Slots, and Reviews publicly viewable
-- This allows guest users (non-logged in) to browse grounds and see reviews.

-- 1. Grounds: Change "TO authenticated" to public (default)
DROP POLICY IF EXISTS "Anyone can view approved active grounds" ON grounds;
CREATE POLICY "Anyone can view approved active grounds"
  ON grounds FOR SELECT
  USING (approved = true AND active = true OR (auth.uid() IS NOT NULL AND (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))));

-- 2. Ground Images: Change "TO authenticated" to public
DROP POLICY IF EXISTS "Anyone can view ground images" ON ground_images;
CREATE POLICY "Anyone can view ground images"
  ON ground_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND (approved = true OR (auth.uid() IS NOT NULL AND owner_id = auth.uid()))));

-- 3. Time Slots: Change "TO authenticated" to public
DROP POLICY IF EXISTS "Anyone can view time slots for visible grounds" ON time_slots;
CREATE POLICY "Anyone can view time slots for visible grounds"
  ON time_slots FOR SELECT
  USING (EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND (approved = true OR (auth.uid() IS NOT NULL AND owner_id = auth.uid()))));

-- 4. Reviews: Change "TO authenticated" to public
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

-- 5. Profiles: Change "TO authenticated" to public for basic info
-- This is necessary to show the name of the reviewer (e.g., reviews.user.full_name)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);
