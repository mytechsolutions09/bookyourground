-- Update owner_bank_details table
ALTER TABLE public.owner_bank_details 
ADD COLUMN IF NOT EXISTS razorpay_account_id text;

-- Update bookings table with breakdown columns
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS ground_price numeric,
ADD COLUMN IF NOT EXISTS platform_fee_user numeric,
ADD COLUMN IF NOT EXISTS platform_fee_owner numeric,
ADD COLUMN IF NOT EXISTS gst_user numeric,
ADD COLUMN IF NOT EXISTS gst_owner numeric,
ADD COLUMN IF NOT EXISTS total_charged numeric,
ADD COLUMN IF NOT EXISTS owner_settlement numeric,
ADD COLUMN IF NOT EXISTS byg_net_revenue numeric,
ADD COLUMN IF NOT EXISTS razorpay_transfer_id text,
ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'pending';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
