-- Create owner_bank_details table to store ground owner payment information
CREATE TABLE IF NOT EXISTS public.owner_bank_details (
    owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    ifsc text NOT NULL,
    upi_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.owner_bank_details ENABLE ROW LEVEL SECURITY;

-- Policies for owner_bank_details

-- 1. Owners can view, insert, update their own details
DROP POLICY IF EXISTS "Owners can manage their own bank details" ON public.owner_bank_details;
CREATE POLICY "Owners can manage their own bank details"
    ON public.owner_bank_details
    FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- 2. Super admins can view all owner bank details for verification and payouts
DROP POLICY IF EXISTS "Super admins can view all bank details" ON public.owner_bank_details;
CREATE POLICY "Super admins can view all bank details"
    ON public.owner_bank_details
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.owner_bank_details;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.owner_bank_details
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
