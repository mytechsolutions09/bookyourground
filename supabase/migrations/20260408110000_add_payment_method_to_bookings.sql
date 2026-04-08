-- Add payment_method to bookings table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_method') THEN
    ALTER TABLE public.bookings ADD COLUMN payment_method text;
  END IF;
END $$;
