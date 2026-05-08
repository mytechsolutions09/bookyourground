-- Add rejection fields for owner bank verification + allow super admins to update

ALTER TABLE public.owner_bank_details
ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Super admins can update bank details for verification workflow (approve/reject)
DROP POLICY IF EXISTS "Super admins can update all bank details" ON public.owner_bank_details;
CREATE POLICY "Super admins can update all bank details"
    ON public.owner_bank_details
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

