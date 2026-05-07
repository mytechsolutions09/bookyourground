-- Create shop product reviews table
CREATE TABLE IF NOT EXISTS shop_product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES shop_products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT, -- Fallback if profile is deleted
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images TEXT[] DEFAULT '{}',
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shop_product_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON shop_product_reviews;
CREATE POLICY "Reviews are viewable by everyone" ON shop_product_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON shop_product_reviews;
CREATE POLICY "Authenticated users can insert reviews" ON shop_product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON shop_product_reviews;
CREATE POLICY "Users can update their own reviews" ON shop_product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all reviews" ON shop_product_reviews;
-- Assuming there's a way to check for admin, for now let's use a placeholder or trust the super admin UI
-- Usually it would be something like: USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
