-- Create platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
-- Only super admins can read/write platform settings
CREATE POLICY "Super admins can manage platform settings" ON platform_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Everyone authenticated can read settings (needed for checkout UI)
CREATE POLICY "Anyone authenticated can view platform settings" ON platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial values if they don't exist
INSERT INTO platform_settings (key, value, description)
VALUES 
  ('cricket_owner_fee_fixed', '100', 'Fixed fee per booking per team for cricket grounds'),
  ('user_platform_fee_rate', '0.05', 'Platform fee rate for users (e.g. 0.05 for 5%)'),
  ('gst_rate', '0.18', 'GST rate (e.g. 0.18 for 18%)')
ON CONFLICT (key) DO NOTHING;
