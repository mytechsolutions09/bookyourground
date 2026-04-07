-- Enhance coupons table for owner-specific discounts
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS ground_id UUID REFERENCES public.grounds(id);

-- Policy to allow ground owners to manage their own coupons
CREATE POLICY "Ground owners can manage own coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Update validate_coupon to handle ground-specific coupons
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_user_id UUID,
  p_booking_amount NUMERIC,
  p_ground_id UUID DEFAULT NULL
)
RETURNS JSONB
AS $$
DECLARE
  v_coupon RECORD;
  v_user_uses INTEGER;
BEGIN
  -- Find coupon (case-insensitive)
  -- Must match ground_id if set, or be global (ground_id IS NULL)
  SELECT * INTO v_coupon 
  FROM public.coupons 
  WHERE upper(code) = upper(p_code) 
  AND is_active = true
  AND (ground_id IS NULL OR ground_id = p_ground_id)
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
