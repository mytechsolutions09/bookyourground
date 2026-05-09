-- Add columns to grounds table for cricket nets support
ALTER TABLE grounds 
ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'hours' CHECK (pricing_model IN ('hours', 'overs')),
ADD COLUMN IF NOT EXISTS is_indoor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_bowling_machine BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lanes_count INTEGER DEFAULT 1;

-- Update time_slots table to store overs count
ALTER TABLE time_slots
ADD COLUMN IF NOT EXISTS overs_count INTEGER;

-- Update bookings table to store lane number
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS lane_number INTEGER;
