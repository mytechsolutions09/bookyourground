-- Make base_price_per_hour nullable and set default to 0 as we are moving to slot-based pricing
ALTER TABLE grounds ALTER COLUMN base_price_per_hour DROP NOT NULL;
ALTER TABLE grounds ALTER COLUMN base_price_per_hour SET DEFAULT 0;

-- Optional: Update existing records to 0 if they are not already (keeping them as is is also fine but 0 is cleaner)
-- UPDATE grounds SET base_price_per_hour = 0 WHERE base_price_per_hour IS NULL;
