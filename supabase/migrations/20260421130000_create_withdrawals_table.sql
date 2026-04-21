/*
  # Create Withdrawals Table
  
  1. New Tables
    - `withdrawals`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, references profiles.id)
      - `amount` (numeric)
      - `status` (text: pending, processing, completed, failed)
      - `payment_method` (text)
      - `account_details` (jsonb)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
  2. Security
    - Enable RLS on `withdrawals` table
    - Add policies for owners to view their own withdrawal requests
    - Add policies for super admins to manage all withdrawal requests
*/

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount decimal(12, 2) NOT NULL CHECK (amount > 0),
    status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    payment_method text,
    account_details jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    -- 1. Owners: View own withdrawals
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Owners can view own withdrawals'
    ) THEN
        CREATE POLICY "Owners can view own withdrawals"
            ON public.withdrawals FOR SELECT
            TO authenticated
            USING (auth.uid() = owner_id);
    END IF;

    -- 2. Owners: Create own withdrawals (request payout)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Owners can create withdrawal requests'
    ) THEN
        CREATE POLICY "Owners can create withdrawal requests"
            ON public.withdrawals FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = owner_id);
    END IF;

    -- 3. Super Admins: All access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Super admins can manage all withdrawals'
    ) THEN
        CREATE POLICY "Super admins can manage all withdrawals"
            ON public.withdrawals FOR ALL
            TO authenticated
            USING (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
            );
    END IF;
END $$;

-- Indexing
CREATE INDEX IF NOT EXISTS idx_withdrawals_owner_id ON public.withdrawals(owner_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_withdrawals_updated_at
    BEFORE UPDATE ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
