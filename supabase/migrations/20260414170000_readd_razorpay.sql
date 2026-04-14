-- Re-add Razorpay as a payment gateway
INSERT INTO public.payment_gateways (name, label, is_active)
VALUES ('razorpay', 'Razorpay', true)
ON CONFLICT (name) DO UPDATE 
SET is_active = true, label = 'Razorpay';
