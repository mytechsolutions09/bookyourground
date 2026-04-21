/*
  # Create Wallet System
  
  1. New Tables
    - `wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles.id)
      - `balance` (numeric, defaults to 0)
      - `currency` (text, defaults to 'INR')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `wallet_transactions`
      - `id` (uuid, primary key)
      - `wallet_id` (uuid, references wallets.id)
      - `amount` (numeric)
      - `type` (enum: credit, debit, refund, payout)
      - `description` (text)
      - `reference_type` (text)
      - `reference_id` (uuid)
      - `status` (text)
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for users to view their own wallet and transactions
    - Automatic wallet creation via trigger on profile creation
*/

-- Create wallet transaction type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE wallet_transaction_type AS ENUM ('credit', 'debit', 'refund', 'payout');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    balance decimal(12, 2) DEFAULT 0.00 NOT NULL,
    currency text DEFAULT 'INR' NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
    amount decimal(12, 2) NOT NULL,
    type wallet_transaction_type NOT NULL,
    description text,
    reference_type text,
    reference_id uuid,
    status text DEFAULT 'completed' NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Safe Policy Creation
DO $$ 
BEGIN
    -- 1. Wallets: User View (Own Wallet)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'Users can view own wallet'
    ) THEN
        CREATE POLICY "Users can view own wallet"
            ON public.wallets FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    -- 2. Wallets: Super Admin View (All Wallets)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'Super admins can view all wallets'
    ) THEN
        CREATE POLICY "Super admins can view all wallets"
            ON public.wallets FOR SELECT
            TO authenticated
            USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            );
    END IF;

    -- 3. Wallet transactions: User View
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions' AND policyname = 'Users can view own wallet transactions'
    ) THEN
        CREATE POLICY "Users can view own wallet transactions"
            ON public.wallet_transactions FOR SELECT
            TO authenticated
            USING (EXISTS (
                SELECT 1 FROM public.wallets 
                WHERE public.wallets.id = wallet_id 
                AND public.wallets.user_id = auth.uid()
            ));
    END IF;
END $$;

-- Function to create wallet for new user
CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.wallets (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet when a profile is created
DROP TRIGGER IF EXISTS on_profile_created_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_wallet
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_wallet();

-- Backfill wallets for existing profiles
INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);

-- Function to add money to wallet (Atomic transaction)
CREATE OR REPLACE FUNCTION public.add_money_to_wallet(
    target_user_id uuid,
    amount_to_add decimal,
    description_text text DEFAULT 'Money added to wallet',
    ref_type text DEFAULT 'system_credit',
    ref_id uuid DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    wallet_record record;
    new_balance decimal;
BEGIN
    -- 1. Find or create the wallet
    INSERT INTO public.wallets (user_id, balance)
    VALUES (target_user_id, 0)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
    RETURNING * INTO wallet_record;

    -- 2. Update the balance
    UPDATE public.wallets
    SET balance = balance + amount_to_add,
        updated_at = now()
    WHERE id = wallet_record.id
    RETURNING balance INTO new_balance;

    -- 3. Record the transaction
    INSERT INTO public.wallet_transactions (
        wallet_id,
        amount,
        type,
        description,
        reference_type,
        reference_id,
        status
    ) VALUES (
        wallet_record.id,
        amount_to_add,
        'credit',
        description_text,
        ref_type,
        ref_id,
        'completed'
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', new_balance
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_money_to_wallet(uuid, decimal, text, text, uuid) TO authenticated;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';


