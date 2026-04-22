-- Fix for withdrawals table schema to ensure all columns exist
DO $$ 
BEGIN
    -- Add payment_method if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'payment_method') THEN
        ALTER TABLE public.withdrawals ADD COLUMN payment_method text;
    END IF;

    -- Add account_details if it doesn't exist (ensure it is jsonb)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'account_details') THEN
        ALTER TABLE public.withdrawals ADD COLUMN account_details jsonb DEFAULT '{}'::jsonb;
    ELSE
        -- Ensure it's jsonb if it exists but might be text (from older versions)
        IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'account_details') = 'text' THEN
            ALTER TABLE public.withdrawals ALTER COLUMN account_details TYPE jsonb USING account_details::jsonb;
        END IF;
    END IF;

    -- Add notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'notes') THEN
        ALTER TABLE public.withdrawals ADD COLUMN notes text;
    END IF;

    -- Ensure updated_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'updated_at') THEN
        ALTER TABLE public.withdrawals ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
