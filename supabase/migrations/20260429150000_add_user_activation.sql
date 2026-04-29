-- Add is_active column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update RLS policies to respect is_active (optional but recommended)
-- Note: You might want to prevent deactivated users from making bookings, etc.
