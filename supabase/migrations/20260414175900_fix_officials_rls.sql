-- Relax RLS for match_officials to allow any user (including guest/anon) to register talent
-- This fixes the 401 Unauthorized error seen during match setup
DROP POLICY IF EXISTS "Authenticated users can register officials" ON match_officials;
CREATE POLICY "Anyone can register match officials" 
ON match_officials FOR INSERT 
WITH CHECK (true);

-- Ensure select is also open to all (already is, but double check)
DROP POLICY IF EXISTS "Anyone can view match officials" ON match_officials;
CREATE POLICY "Anyone can view match officials" 
ON match_officials FOR SELECT 
USING (true);
