-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  min_booking_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  expiry_date TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update bookings table to support coupons
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- RLS policies for coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can select active coupons to validate them
CREATE POLICY "Anyone can check active coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (is_active = true AND (expiry_date IS NULL OR expiry_date > now()));

-- Super admins can manage all coupons
CREATE POLICY "Super admins can manage coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- RPC to validate coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_user_id UUID,
  p_booking_amount NUMERIC
)
RETURNS JSONB
AS $$
DECLARE
  v_coupon RECORD;
  v_user_uses INTEGER;
BEGIN
  -- Find coupon (case-insensitive)
  SELECT * INTO v_coupon 
  FROM public.coupons 
  WHERE upper(code) = upper(p_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid coupon code');
  END IF;

  -- Check expiry
  IF v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < now() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon has expired');
  END IF;

  -- Check total usage limit
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon usage limit reached');
  END IF;

  -- Check min booking amount
  IF p_booking_amount < v_coupon.min_booking_amount THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Minimum booking amount of ₹' || v_coupon.min_booking_amount || ' required');
  END IF;

  -- Check per-user limit
  SELECT count(*) INTO v_user_uses
  FROM public.bookings
  WHERE user_id = p_user_id AND coupon_id = v_coupon.id AND status != 'cancelled';

  IF v_user_uses >= COALESCE(v_coupon.max_uses_per_user, 1) THEN
    RETURN jsonb_build_object('valid', false, 'message', 'You have already used this coupon');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'max_discount', v_coupon.max_discount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment used_count on booking confirmation
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger AS $$
BEGIN
  IF NEW.coupon_id IS NOT NULL AND (OLD.coupon_id IS NULL OR OLD.status != 'confirmed') AND NEW.status = 'confirmed' THEN
    UPDATE public.coupons 
    SET used_count = used_count + 1 
    WHERE id = NEW.coupon_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_coupon_used
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.increment_coupon_usage();

-- Seed some initial coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_booking_amount, max_discount, usage_limit)
VALUES 
('FIRST30', 'percentage', 30, 500, 200, 1000),
('FLAT100', 'fixed', 100, 800, NULL, 500),
('WELCOME', 'percentage', 15, 0, 500, 10000)
ON CONFLICT (code) DO NOTHING;
