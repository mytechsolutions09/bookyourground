-- Add return functionality to shop order items
ALTER TABLE public.shop_order_items 
ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS return_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ DEFAULT NULL;

-- Add check constraint for return_status
-- Statuses: requested, approved, rejected, completed
ALTER TABLE public.shop_order_items
DROP CONSTRAINT IF EXISTS shop_order_items_return_status_check;

ALTER TABLE public.shop_order_items
ADD CONSTRAINT shop_order_items_return_status_check 
CHECK (return_status IN ('requested', 'approved', 'rejected', 'completed') OR return_status IS NULL);

-- Add policy for users to update their own return request
DROP POLICY IF EXISTS "Users can update their own return request" ON public.shop_order_items;
CREATE POLICY "Users can update their own return request" ON public.shop_order_items 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM shop_orders 
        WHERE shop_orders.id = order_id 
        AND shop_orders.user_id = auth.uid()
        AND shop_orders.status = 'delivered'
    )
);

-- Super admins can update everything (already covered by common admin policies if any, but let's be explicit if needed)
DROP POLICY IF EXISTS "Super admins can update order items" ON public.shop_order_items;
CREATE POLICY "Super admins can update order items" ON public.shop_order_items 
FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
