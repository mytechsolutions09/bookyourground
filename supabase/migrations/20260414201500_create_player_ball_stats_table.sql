-- Create a dedicated table for granular player statistics partitioned by ball type
-- This supports Leather, Tennis, and Other ball formats separately

CREATE TABLE IF NOT EXISTS public.player_ball_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    ball_type TEXT NOT NULL CHECK (ball_type IN ('leather', 'tennis', 'other')),
    
    -- Batting Stats
    matches_played INTEGER DEFAULT 0,
    innings_batted INTEGER DEFAULT 0,
    not_outs INTEGER DEFAULT 0,
    total_runs INTEGER DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    strike_rate DECIMAL(5,2) DEFAULT 0.00,
    thirties INTEGER DEFAULT 0,
    fifties INTEGER DEFAULT 0,
    hundreds INTEGER DEFAULT 0,
    fours_hit INTEGER DEFAULT 0,
    sixes_hit INTEGER DEFAULT 0,
    balls_faced INTEGER DEFAULT 0,

    -- Bowling Stats
    innings_bowled INTEGER DEFAULT 0,
    overs_bowled DECIMAL(5,1) DEFAULT 0.0,
    maidens INTEGER DEFAULT 0,
    runs_conceded INTEGER DEFAULT 0,
    total_wickets INTEGER DEFAULT 0,
    best_bowling_wickets INTEGER DEFAULT 0,
    best_bowling_runs INTEGER DEFAULT 0,
    economy_rate DECIMAL(5,2) DEFAULT 0.00,
    five_wicket_hauls INTEGER DEFAULT 0,

    -- Fielding Stats
    total_catches INTEGER DEFAULT 0,
    run_outs INTEGER DEFAULT 0,
    stumpings INTEGER DEFAULT 0,

    -- Captaincy Stats
    matches_captained INTEGER DEFAULT 0,
    matches_won_as_captain INTEGER DEFAULT 0,
    matches_lost_as_captain INTEGER DEFAULT 0,
    matches_tied_as_captain INTEGER DEFAULT 0,
    matches_abandoned_as_captain INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    -- Ensure one record per member per ball type
    CONSTRAINT unique_member_ball_stats UNIQUE (member_id, ball_type)
);

-- Enable RLS
ALTER TABLE public.player_ball_stats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Player stats are viewable by everyone" 
ON public.player_ball_stats FOR SELECT 
TO authenticated 
USING (true);

-- Indexes for performance
CREATE INDEX idx_player_ball_stats_member ON public.player_ball_stats(member_id);
CREATE INDEX idx_player_ball_stats_ball_type ON public.player_ball_stats(ball_type);

-- Trigger for updated_at
CREATE TRIGGER update_player_ball_stats_updated_at BEFORE UPDATE ON public.player_ball_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
