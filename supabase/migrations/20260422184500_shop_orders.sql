-- Create shop orders and order items tables
CREATE TABLE IF NOT EXISTS public.shop_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    shipping_address JSONB,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shop_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.shop_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.shop_orders;
CREATE POLICY "Users can view their own orders" ON public.shop_orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.shop_orders;
CREATE POLICY "Users can insert their own orders" ON public.shop_orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can view all orders" ON public.shop_orders;
CREATE POLICY "Super admins can view all orders" ON public.shop_orders FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Super admins can update orders" ON public.shop_orders;
CREATE POLICY "Super admins can update orders" ON public.shop_orders FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Policies for order items
DROP POLICY IF EXISTS "Users can view their own order items" ON public.shop_order_items;
CREATE POLICY "Users can view their own order items" ON public.shop_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM shop_orders WHERE id = order_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own order items" ON public.shop_order_items;
CREATE POLICY "Users can insert their own order items" ON public.shop_order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shop_orders WHERE id = order_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all order items" ON public.shop_order_items;
CREATE POLICY "Super admins can view all order items" ON public.shop_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Trigger for updated_at on shop_orders
DROP TRIGGER IF EXISTS set_shop_orders_updated_at ON public.shop_orders;
CREATE TRIGGER set_shop_orders_updated_at
BEFORE UPDATE ON public.shop_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
