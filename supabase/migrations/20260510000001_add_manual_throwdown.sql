-- Add has_manual_throwdown to grounds table
ALTER TABLE grounds 
ADD COLUMN IF NOT EXISTS has_manual_throwdown BOOLEAN DEFAULT false;

