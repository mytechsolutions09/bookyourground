-- Create shop categories table
CREATE TABLE IF NOT EXISTS shop_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shop products table
CREATE TABLE IF NOT EXISTS shop_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES shop_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    discount_price DECIMAL(12, 2),
    stock_quantity INTEGER DEFAULT 0,
    images TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    specifications JSONB DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    tag TEXT,
    rating DECIMAL(2, 1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shop cart table (optional, but good for persistence across devices)
CREATE TABLE IF NOT EXISTS shop_cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES shop_products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create shop favorites table
CREATE TABLE IF NOT EXISTS shop_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES shop_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Ensure unique constraints for ON CONFLICT to work
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_categories_name_key') THEN
        ALTER TABLE shop_categories ADD CONSTRAINT shop_categories_name_key UNIQUE (name);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_products_name_key') THEN
        ALTER TABLE shop_products ADD CONSTRAINT shop_products_name_key UNIQUE (name);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for public data
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON shop_categories;
CREATE POLICY "Categories are viewable by everyone" ON shop_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products are viewable by everyone" ON shop_products;
CREATE POLICY "Products are viewable by everyone" ON shop_products FOR SELECT USING (true);

-- Policies for cart
DROP POLICY IF EXISTS "Users can view their own cart" ON shop_cart;
CREATE POLICY "Users can view their own cart" ON shop_cart FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own cart" ON shop_cart;
CREATE POLICY "Users can manage their own cart" ON shop_cart FOR ALL USING (auth.uid() = user_id);

-- Policies for favorites
DROP POLICY IF EXISTS "Users can view their own product favorites" ON shop_favorites;
CREATE POLICY "Users can view their own product favorites" ON shop_favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own product favorites" ON shop_favorites;
CREATE POLICY "Users can manage their own product favorites" ON shop_favorites FOR ALL USING (auth.uid() = user_id);

-- Seed Categories
INSERT INTO shop_categories (name, icon, sort_order) 
VALUES
('Bats', '🏏', 1),
('Balls', '⚾', 2),
('Shoes', '👟', 3),
('Apparel', '👕', 4),
('Safety', '🛡️', 5)
ON CONFLICT (name) DO NOTHING;

-- Example Products Seed
INSERT INTO shop_products (category_id, name, description, price, is_featured, tag, rating, review_count, images, features, specifications)
SELECT 
    id, 
    'SS Ton Reserve Edition', 
    'The SS Ton Reserve Edition is a professional-grade cricket bat made from the finest Grade 1+ English Willow.', 
    24500, 
    true, 
    'Premium', 
    4.9, 
    124, 
    ARRAY['https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80'],
    ARRAY['Hand-selected Grade 1+ English Willow', 'Air Dried Willow for performance', 'Latest shape with massive edges'],
    '{"Weight": "1180 - 1240 grams", "Willow Type": "English Willow Grade 1+", "Sweet Spot": "Mid to Low"}'::jsonb
FROM shop_categories 
WHERE name = 'Bats'
LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO shop_products (category_id, name, description, price, is_featured, tag, rating, review_count, images, features, specifications)
SELECT 
    id, 
    'SG Pro Soft Balls (Pack of 6)', 
    'High-quality four-piece leather balls suitable for club and tournament matches.', 
    1200, 
    true, 
    'Best Seller', 
    4.7, 
    89, 
    ARRAY['https://images.unsplash.com/photo-1593766788306-285610866ea4?w=800&q=80'],
    ARRAY['Waterproofed alum-tanned leather', 'Four-piece construction', 'High-quality center cork core'],
    '{"Quantity": "Pack of 6", "Material": "Genuine Leather", "Usage": "Match Play"}'::jsonb
FROM shop_categories 
WHERE name = 'Balls'
LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO shop_products (category_id, name, description, price, is_featured, tag, rating, review_count, images, features, specifications)
SELECT 
    id, 
    'Adidas Adipower Vector', 
    'Designed for fast bowlers, provides ultimate stability and cushioning.', 
    8990, 
    true, 
    NULL, 
    4.8, 
    56, 
    ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'],
    ARRAY['Revolutionary BOA closure system', 'Mid-cut construction for support', 'Durable Adiwear outsole'],
    '{"Type": "Bowling Spikes", "Fit": "Regular Fit"}'::jsonb
FROM shop_categories 
WHERE name = 'Shoes'
LIMIT 1
ON CONFLICT (name) DO NOTHING;
