-- Relax RLS for scoring related tables to ensure guest users can also score matches
-- This resolves 401 Unauthorized errors during match setup and scoring

-- 1. match_officials
DROP POLICY IF EXISTS "Anyone can register match officials" ON match_officials;
CREATE POLICY "Anyone can register match officials" ON match_officials FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can view match officials" ON match_officials;
CREATE POLICY "Anyone can view match officials" ON match_officials FOR SELECT USING (true);

-- 2. match_assignments
DROP POLICY IF EXISTS "Public match assignments are viewable by everyone" ON match_assignments;
CREATE POLICY "Anyone can view match assignments" ON match_assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage match assignments" ON match_assignments;
CREATE POLICY "Anyone can manage match assignments" ON match_assignments FOR ALL USING (true);

-- 3. matches (ensure anyone can update status etc if they have access)
-- Note: matches already has policies usually, but let's ensure scoring is smooth
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'matches') THEN
        DROP POLICY IF EXISTS "Anyone can view matches" ON matches;
        CREATE POLICY "Anyone can view matches" ON matches FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Anyone can update matches" ON matches;
        CREATE POLICY "Anyone can update matches" ON matches FOR UPDATE USING (true);
    END IF;
END $$;
