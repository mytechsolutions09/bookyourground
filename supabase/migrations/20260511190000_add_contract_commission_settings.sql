-- ============================================================
-- Migration: 20260511190000_add_contract_commission_settings.sql
-- Description: Store default partner commission in platform_settings
--              so super-admin can configure it centrally.
--              Also relax NOT NULL on commission columns in
--              contract_submissions (admin now owns those values).
-- ============================================================

-- ── 1. Seed commission settings rows ─────────────────────────
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('contract_commission_type',  '"percent"', 'Partner commission type: "percent" or "flat"'),
  ('contract_commission_value', '10',        'Partner commission value (% or ₹ per booking)'),
  ('contract_commission_gst',   'true',      'Whether GST is added on top of the commission')
ON CONFLICT (key) DO NOTHING;

-- ── 2. Allow anon to read commission settings (needed by the
--       public contract-signing page before the owner logs in) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'platform_settings'
      AND policyname = 'Anon can read commission settings'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Anon can read commission settings"
        ON public.platform_settings
        FOR SELECT
        TO anon
        USING (key IN (
          'contract_commission_type',
          'contract_commission_value',
          'contract_commission_gst'
        ));
    $pol$;
  END IF;
END $$;

-- ── 3. Make commission columns nullable in contract_submissions ─
--       (values are snapshotted from platform_settings at submit time)
ALTER TABLE public.contract_submissions
  ALTER COLUMN commission_type  DROP NOT NULL,
  ALTER COLUMN commission_value DROP NOT NULL;
