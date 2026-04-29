-- Update shop cart table to support product variations
ALTER TABLE shop_cart ADD COLUMN IF NOT EXISTS selected_attributes JSONB DEFAULT '{}';

-- Update shop order items table to persist variations
ALTER TABLE shop_order_items ADD COLUMN IF NOT EXISTS selected_attributes JSONB DEFAULT '{}';

-- Change unique constraint to include selected_attributes
ALTER TABLE shop_cart DROP CONSTRAINT IF EXISTS shop_cart_user_id_product_id_key;
ALTER TABLE shop_cart ADD CONSTRAINT shop_cart_user_id_product_id_attributes_key UNIQUE (user_id, product_id, selected_attributes);
