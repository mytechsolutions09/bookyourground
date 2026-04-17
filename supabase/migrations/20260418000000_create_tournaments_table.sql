
-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'upcoming', -- upcoming, ongoing, completed
  banner_url TEXT,
  entry_fee DECIMAL(10, 2) DEFAULT 0,
  prize_pool TEXT,
  max_teams INTEGER DEFAULT 16,
  min_teams INTEGER DEFAULT 4,
  rules TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tournament_teams junction table for registration
CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Anyone can view tournaments"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage their tournaments"
  ON tournaments FOR ALL
  USING (auth.uid() = organizer_id);

CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for tournament_teams
CREATE POLICY "Anyone can view tournament teams"
  ON tournament_teams FOR SELECT
  USING (true);

CREATE POLICY "Team captains can register for tournaments"
  ON tournament_teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Seed some initial tournaments
INSERT INTO tournaments (name, description, location, start_date, end_date, status, banner_url, prize_pool)
VALUES 
('WCL 11 Season', 'The biggest cricket league in NCR.', 'Gurugram', '2026-01-22', '2026-04-30', 'ongoing', 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg', '₹1,00,000'),
('The Weekend Bash', 'Weekly corporate tournament.', 'Gurugram', '2026-04-06', '2026-04-27', 'ongoing', 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg', '₹25,000'),
('Summer Cup 2026', 'Junior and Senior category tournament.', 'Delhi', '2026-05-15', '2026-06-15', 'upcoming', 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg', '₹50,000');
