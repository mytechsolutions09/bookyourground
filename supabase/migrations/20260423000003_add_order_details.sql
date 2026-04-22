-- Add missing columns to shop_orders table
ALTER TABLE public.shop_orders 
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
