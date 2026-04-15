-- Add payment_received column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_received BOOLEAN DEFAULT FALSE;
