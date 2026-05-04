-- Add min_price column to grounds table
ALTER TABLE grounds ADD COLUMN IF NOT EXISTS min_price decimal(10, 2);

-- Function to update min_price for a ground
CREATE OR REPLACE FUNCTION update_ground_min_price()
RETURNS TRIGGER AS $$
DECLARE
    v_min_price decimal(10, 2);
    v_ground_id uuid;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_ground_id := OLD.ground_id;
    ELSE
        v_ground_id := NEW.ground_id;
    END IF;

    SELECT MIN(custom_price)
    INTO v_min_price
    FROM time_slots
    WHERE ground_id = v_ground_id
      AND is_available = true
      AND custom_price IS NOT NULL;

    UPDATE grounds
    SET min_price = v_min_price
    WHERE id = v_ground_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update min_price when time_slots change
DROP TRIGGER IF EXISTS trigger_update_min_price ON time_slots;
CREATE TRIGGER trigger_update_min_price
AFTER INSERT OR UPDATE OR DELETE ON time_slots
FOR EACH ROW
EXECUTE FUNCTION update_ground_min_price();

-- Backfill min_price for existing grounds
UPDATE grounds g
SET min_price = (
    SELECT MIN(custom_price)
    FROM time_slots
    WHERE ground_id = g.id
      AND is_available = true
      AND custom_price IS NOT NULL
);
