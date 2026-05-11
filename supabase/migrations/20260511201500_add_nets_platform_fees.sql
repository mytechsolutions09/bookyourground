-- ============================================================
-- Migration: 20260511201500_add_nets_platform_fees.sql
-- Description: Add platform fee settings specifically for nets and lanes.
-- ============================================================

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('nets_owner_fee_fixed', '25',   'Fixed platform fee for owner/cash bookings on nets/lanes (₹ per slot)'),
  ('nets_user_fee_rate',   '0.10', 'Platform fee percentage for user online bookings on nets/lanes (e.g. 0.10 for 10%)')
ON CONFLICT (key) DO NOTHING;
