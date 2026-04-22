-- Add Admin CRUD policies for shop inventory

-- 1. shop_categories policies
DROP POLICY IF EXISTS "Admins can manage categories" ON shop_categories;
CREATE POLICY "Admins can manage categories"
ON shop_categories
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com');

-- 2. shop_products policies
DROP POLICY IF EXISTS "Admins can manage products" ON shop_products;
CREATE POLICY "Admins can manage products"
ON shop_products
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com');
