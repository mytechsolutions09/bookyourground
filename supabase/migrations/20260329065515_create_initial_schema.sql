/*
  # Cricket Ground Booking App - Initial Schema

  ## Overview
  This migration creates the complete database schema for a cricket ground booking platform
  with three user roles: regular users, ground owners, and super admins.

  ## Tables Created
  
  1. **profiles**
     - Extends auth.users with additional profile information
     - Stores user role (user, ground_owner, super_admin)
     - Contains contact details and verification status
  
  2. **grounds**
     - Stores cricket ground information
     - Links to ground owner via owner_id
     - Contains location, amenities, pricing, and availability settings
     - Includes verification and approval status
  
  3. **ground_images**
     - Stores multiple images for each ground
     - Supports image ordering and primary image selection
  
  4. **time_slots**
     - Manages available time slots for each ground
     - Supports custom pricing per slot
     - Handles day-specific availability
  
  5. **bookings**
     - Records all ground bookings
     - Links users to grounds with time information
     - Tracks booking status and payment
  
  6. **reviews**
     - User reviews and ratings for grounds
     - One review per user per ground
  
  7. **transactions**
     - Financial transaction records
     - Links to bookings for payment tracking
  
  8. **favorites**
     - User wishlist/favorites feature
  
  9. **notifications**
     - In-app notification system
     - Role-based notifications

  ## Security
  - RLS enabled on all tables
  - Role-based access policies
  - Ownership and authentication checks
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('user', 'ground_owner', 'super_admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'rejected');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'user' NOT NULL,
  full_name text NOT NULL,
  phone text,
  phone_verified boolean DEFAULT false,
  avatar_url text,
  business_name text,
  business_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Grounds table
CREATE TABLE IF NOT EXISTS grounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  base_price_per_hour decimal(10, 2) NOT NULL,
  pitch_type text,
  ground_size text,
  has_floodlights boolean DEFAULT false,
  has_parking boolean DEFAULT false,
  has_changing_rooms boolean DEFAULT false,
  has_pavilion boolean DEFAULT false,
  capacity integer,
  verified boolean DEFAULT false,
  approved boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ground images table
CREATE TABLE IF NOT EXISTS ground_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_id uuid REFERENCES grounds(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Time slots table
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_id uuid REFERENCES grounds(id) ON DELETE CASCADE NOT NULL,
  day_of_week day_of_week NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  custom_price decimal(10, 2),
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ground_id uuid REFERENCES grounds(id) ON DELETE CASCADE NOT NULL,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  total_hours decimal(4, 2) NOT NULL,
  price_per_hour decimal(10, 2) NOT NULL,
  total_amount decimal(10, 2) NOT NULL,
  status booking_status DEFAULT 'pending' NOT NULL,
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ground_id uuid REFERENCES grounds(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ground_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10, 2) NOT NULL,
  status transaction_status DEFAULT 'pending' NOT NULL,
  payment_method text,
  transaction_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ground_id uuid REFERENCES grounds(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ground_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean DEFAULT false,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_grounds_owner ON grounds(owner_id);
CREATE INDEX IF NOT EXISTS idx_grounds_city ON grounds(city);
CREATE INDEX IF NOT EXISTS idx_grounds_active ON grounds(active, approved);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ground ON bookings(ground_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_ground ON reviews(ground_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_time_slots_ground ON time_slots(ground_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ground_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Grounds policies
CREATE POLICY "Anyone can view approved active grounds"
  ON grounds FOR SELECT
  TO authenticated
  USING (approved = true AND active = true OR owner_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Ground owners can insert own grounds"
  ON grounds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id AND 
              EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ground_owner', 'super_admin')));

CREATE POLICY "Ground owners can update own grounds"
  ON grounds FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR 
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (auth.uid() = owner_id OR 
              EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Ground owners can delete own grounds"
  ON grounds FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR 
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Ground images policies
CREATE POLICY "Anyone can view ground images"
  ON ground_images FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND (approved = true OR owner_id = auth.uid())));

CREATE POLICY "Ground owners can manage own ground images"
  ON ground_images FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND owner_id = auth.uid()));

-- Time slots policies
CREATE POLICY "Anyone can view time slots for visible grounds"
  ON time_slots FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND (approved = true OR owner_id = auth.uid())));

CREATE POLICY "Ground owners can manage own ground time slots"
  ON time_slots FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND owner_id = auth.uid()));

-- Bookings policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND owner_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and ground owners can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND owner_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (user_id = auth.uid() OR 
              EXISTS (SELECT 1 FROM grounds WHERE id = ground_id AND owner_id = auth.uid()) OR
              EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for their bookings"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND 
              EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND user_id = auth.uid() AND status = 'completed'));

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM bookings b JOIN grounds g ON b.ground_id = g.id WHERE b.id = booking_id AND g.owner_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "System can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_grounds_updated_at BEFORE UPDATE ON grounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();