-- Create shop products storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shop_products', 'shop_products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for shop_products
CREATE POLICY "shop_products_view_policy" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'shop_products');

CREATE POLICY "shop_products_admin_upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'shop_products' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "shop_products_admin_delete" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'shop_products' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');
