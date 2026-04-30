-- Align Wallet System with "Refund-only" Myntra Model

-- 1. Update Transaction Types
-- We add 'referral', 'promo', and 'used' to the existing enum
ALTER TYPE public.wallet_transaction_type ADD VALUE IF NOT EXISTS 'referral';
ALTER TYPE public.wallet_transaction_type ADD VALUE IF NOT EXISTS 'promo';
ALTER TYPE public.wallet_transaction_type ADD VALUE IF NOT EXISTS 'used';

-- 2. Enhance wallet_transactions table
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id);

-- Backfill user_id from wallet_id for existing transactions
UPDATE public.wallet_transactions wt
SET user_id = w.user_id
FROM public.wallets w
WHERE wt.wallet_id = w.id
AND wt.user_id IS NULL;

-- 3. Update RLS policies to use user_id directly for faster access
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Create a streamlined function for wallet operations
-- This function handles balance updates and transaction logging in one go.
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
    p_user_id uuid,
    p_amount numeric,
    p_type text, -- 'refund', 'referral', 'promo', 'used'
    p_description text,
    p_booking_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id uuid;
    v_new_balance numeric;
    v_type_enum wallet_transaction_type;
BEGIN
    -- Map string type to enum
    -- If p_type is 'used', it's a debit (negative amount should be passed or we handle it)
    -- We'll assume p_amount is positive for credits and negative for 'used'
    
    CASE p_type
        WHEN 'refund' THEN v_type_enum := 'refund';
        WHEN 'referral' THEN v_type_enum := 'referral';
        WHEN 'promo' THEN v_type_enum := 'promo';
        WHEN 'used' THEN v_type_enum := 'used';
        ELSE v_type_enum := 'credit'; -- Fallback
    END CASE;

    -- 1. Find the wallet
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
    
    IF v_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, balance)
        VALUES (p_user_id, 0)
        RETURNING id INTO v_wallet_id;
    END IF;

    -- 2. Update balance
    UPDATE public.wallets
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

    -- 3. Record transaction
    INSERT INTO public.wallet_transactions (
        wallet_id,
        user_id,
        amount,
        type,
        description,
        booking_id,
        status
    ) VALUES (
        v_wallet_id,
        p_user_id,
        p_amount,
        v_type_enum,
        p_description,
        p_booking_id,
        'completed'
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, numeric, text, text, uuid) TO authenticated;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
