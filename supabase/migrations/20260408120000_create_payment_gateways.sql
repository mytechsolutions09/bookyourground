-- Create payment_gateways table
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    label text NOT NULL,
    is_active boolean DEFAULT false,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can view active gateways (to know what to use in checkout)
CREATE POLICY "Public can view active gateways" ON public.payment_gateways
    FOR SELECT USING (is_active = true);

-- Policies: Super admin can manage everything
CREATE POLICY "Super admins can manage gateways" ON public.payment_gateways
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Insert initial gateways
INSERT INTO public.payment_gateways (name, label, is_active)
VALUES 
    ('razorpay', 'Razorpay', true),
    ('payu', 'PayU India', false),
    ('cash', 'Cash (Owners Only)', true)
ON CONFLICT (name) DO NOTHING;
