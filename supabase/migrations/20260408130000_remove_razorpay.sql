-- Migration to ensure PayU and Cash are active, and Razorpay is removed
DELETE FROM payment_gateways WHERE name = 'razorpay';

INSERT INTO public.payment_gateways (name, label, is_active)
VALUES 
    ('payu', 'PayU India', true),
    ('cash', 'Cash (Owners Only)', true)
ON CONFLICT (name) DO UPDATE 
SET is_active = EXCLUDED.is_active, label = EXCLUDED.label;
