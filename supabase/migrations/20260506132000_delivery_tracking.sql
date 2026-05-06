-- Add delivery tracking and return period logic
ALTER TABLE public.shop_orders 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;

-- Update delivered_at when status changes to delivered
CREATE OR REPLACE FUNCTION public.handle_shop_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        NEW.delivered_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_shop_order_status_change ON public.shop_orders;
CREATE TRIGGER on_shop_order_status_change
BEFORE UPDATE ON public.shop_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_shop_order_status_change();

-- Add return period to shop products (default 7 days)
ALTER TABLE public.shop_products
ADD COLUMN IF NOT EXISTS return_period_days INTEGER DEFAULT 7;
