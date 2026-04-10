-- Add booked_for_name column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booked_for_name TEXT;
