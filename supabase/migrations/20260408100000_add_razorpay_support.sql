-- Add Razorpay order ID to bookings table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'razorpay_order_id') THEN
    ALTER TABLE public.bookings ADD COLUMN razorpay_order_id text;
  END IF;
END $$;

-- Update booking_status if needed (but 'pending' and 'confirmed' already exist)
-- Let's make sure 'pending' is what we use after 'Book now' before payment.
-- Actually, the initial schema DEFAULT is 'pending'.

-- Also make sure transactions have enough info
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'razorpay_signature') THEN
    ALTER TABLE public.transactions ADD COLUMN razorpay_signature text;
  END IF;
END $$;
