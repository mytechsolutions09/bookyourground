-- Fix relationship between shop_orders and profiles
-- This ensures PostgREST can perform joins between these tables

-- 1. Ensure the user_id column exists and is of the correct type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_orders' AND column_name = 'user_id') THEN
        ALTER TABLE public.shop_orders ADD COLUMN user_id UUID;
    END IF;
END $$;

-- 2. Add the foreign key constraint
ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_user_id_fkey;

ALTER TABLE public.shop_orders
ADD CONSTRAINT shop_orders_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 3. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
