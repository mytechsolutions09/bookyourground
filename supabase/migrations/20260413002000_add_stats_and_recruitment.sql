-- Add statistical columns to team_members to support the Leaderboard and Stats UI
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_runs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_wickets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_catches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_bowling VARCHAR(20),
ADD COLUMN IF NOT EXISTS strike_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS economy_rate DECIMAL(5,2) DEFAULT 0.00;

-- Create recruitment_requests table for players joining via public link
CREATE TABLE IF NOT EXISTS recruitment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    player_phone TEXT NOT NULL,
    player_email TEXT,
    position TEXT,
    experience_years INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for recruitment_requests
ALTER TABLE recruitment_requests ENABLE ROW LEVEL SECURITY;

-- Policies for recruitment_requests
-- 1. Anyone can create a request (for the public invite link)
CREATE POLICY "Anyone can create recruitment requests" 
ON recruitment_requests FOR INSERT 
WITH CHECK (true);

-- 2. Only the team captain (owner) can view/update requests
CREATE POLICY "Captains can manage their team requests" 
ON recruitment_requests FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = recruitment_requests.team_id 
        AND teams.owner_id = auth.uid()
    )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_recruitment_team ON recruitment_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_status ON recruitment_requests(status);
