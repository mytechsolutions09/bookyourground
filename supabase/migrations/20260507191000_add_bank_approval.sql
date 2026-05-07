-- Add is_approved column to owner_bank_details
ALTER TABLE public.owner_bank_details 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Add approved_at and approved_by columns
ALTER TABLE public.owner_bank_details 
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
