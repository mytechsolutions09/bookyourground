-- Create match_officials table to store professional officials data
CREATE TABLE IF NOT EXISTS match_officials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'Official',
    experience_years INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 4.5,
    city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE match_officials ENABLE ROW LEVEL SECURITY;

-- Policies for match_officials
-- 1. Anyone can view officials (for public match details)
DROP POLICY IF EXISTS "Anyone can view match officials" ON match_officials;
CREATE POLICY "Anyone can view match officials" 
ON match_officials FOR SELECT 
USING (true);

-- 2. Any authenticated user can create an official (to register talent)
DROP POLICY IF EXISTS "Authenticated users can register officials" ON match_officials;
CREATE POLICY "Authenticated users can register officials" 
ON match_officials FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Indices for fast searching
CREATE INDEX IF NOT EXISTS idx_official_phone ON match_officials(phone);
CREATE INDEX IF NOT EXISTS idx_official_name ON match_officials(name);
