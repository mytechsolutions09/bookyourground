-- Add payout control columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payout_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payout_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payout_error TEXT;

-- Index for the daily cron job performance
CREATE INDEX IF NOT EXISTS idx_bookings_payout_lookup 
ON public.bookings (booking_date, payout_status, payout_enabled)
WHERE status = 'confirmed';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the payout automation (3:30 AM UTC = 9:00 AM IST)
-- IMPORTANT: You must manually replace 'YOUR_SERVICE_ROLE_KEY' in the Supabase Dashboard 
-- or via SQL Editor if you want to update this later with the actual key.
SELECT cron.schedule(
  'daily-razorpay-payout',
  '30 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nwvarvvyhjkvtgijwfkc.supabase.co/functions/v1/razorpay-automated-payout',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )
  $$
);
