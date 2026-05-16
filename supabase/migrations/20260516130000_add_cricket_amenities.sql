-- Migration to add cricket-specific amenities to grounds table
ALTER TABLE grounds 
ADD COLUMN has_umpires BOOLEAN DEFAULT FALSE,
ADD COLUMN has_new_balls BOOLEAN DEFAULT FALSE,
ADD COLUMN has_scoring BOOLEAN DEFAULT FALSE,
ADD COLUMN has_practice_nets BOOLEAN DEFAULT FALSE;
