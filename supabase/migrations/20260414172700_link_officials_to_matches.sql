-- Migration to link officials to matches and track assignments
CREATE TABLE IF NOT EXISTS match_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    official_id UUID REFERENCES match_officials(id),
    role TEXT NOT NULL CHECK (role IN ('umpire', 'scorer', 'commentator', 'match_referee', 'other')),
    position INTEGER DEFAULT 0, -- e.g. 1 for Umpire 1, 2 for Umpire 2
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, official_id, role)
);

-- Index for fast lookup by match
CREATE INDEX IF NOT EXISTS idx_match_assignment_match ON match_assignments(match_id);

-- Enable RLS
ALTER TABLE match_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public match assignments are viewable by everyone" 
ON match_assignments FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage match assignments" 
ON match_assignments FOR ALL 
USING (auth.role() = 'authenticated');

-- Also add a JSONB column to matches for easy front-end retrieval of current state
-- This acts as a cache of the assignments for quick rendering in lists
ALTER TABLE matches ADD COLUMN IF NOT EXISTS officials_config JSONB DEFAULT '{}'::jsonb;
