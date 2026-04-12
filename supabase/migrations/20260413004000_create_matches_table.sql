-- Main matches table to store configurations and current state
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_a_id UUID REFERENCES teams(id),
    team_b_id UUID REFERENCES teams(id),
    
    -- Match Rules
    match_type TEXT NOT NULL DEFAULT 'limited overs',
    total_overs INTEGER DEFAULT 20,
    overs_per_bowler INTEGER DEFAULT 4,
    ball_type TEXT DEFAULT 'leather',
    wagon_wheel BOOLEAN DEFAULT true,
    pitch_type TEXT DEFAULT 'matting',
    
    -- Location & Schedule
    state TEXT,
    city TEXT,
    ground TEXT,
    date_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Toss Result
    toss_winner_id UUID REFERENCES teams(id),
    toss_decision TEXT CHECK (toss_decision IN ('bat', 'bowl')),
    
    -- Current Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'abandoned')),
    current_inning INTEGER DEFAULT 1,
    
    -- Opening State (Optional initially, populated on start)
    striker_id UUID REFERENCES team_members(id),
    non_striker_id UUID REFERENCES team_members(id),
    bowler_id UUID REFERENCES team_members(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to track which players are participating in each match (Playing XI)
CREATE TABLE IF NOT EXISTS match_playing_xi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    player_id UUID REFERENCES team_members(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, player_id) -- A player can only be in one XI per match
);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_playing_xi ENABLE ROW LEVEL SECURITY;

-- Policies for public viewing
CREATE POLICY "Public matches are viewable by everyone" ON matches FOR SELECT USING (true);
CREATE POLICY "Public playing XIs are viewable by everyone" ON match_playing_xi FOR SELECT USING (true);

-- Policies for authenticated management (Captains/Managers)
CREATE POLICY "Authenticated users can create matches" ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update match details" ON matches FOR UPDATE USING (auth.role() = 'authenticated');

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_match_team_a ON matches(team_a_id);
CREATE INDEX IF NOT EXISTS idx_match_team_b ON matches(team_b_id);
CREATE INDEX IF NOT EXISTS idx_match_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_playing_xi_match ON match_playing_xi(match_id);
