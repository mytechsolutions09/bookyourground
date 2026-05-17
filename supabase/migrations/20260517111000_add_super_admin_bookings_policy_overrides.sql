-- Migration to enable SELECT and UPDATE overrides on bookings for super admin by email
-- Timestamp: 2026-05-17T11:10:00Z

-- 1. Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own bookings and matched opponents" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- 2. Create updated SELECT policy with super admin override email check
CREATE POLICY "Users can view own bookings and matched opponents"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.grounds 
    WHERE public.grounds.id = public.bookings.ground_id 
    AND public.grounds.owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
    AND public.profiles.role = 'super_admin'
  ) OR
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com' OR
  (
    public.bookings.status = 'confirmed' AND
    public.check_user_has_booking_at_slot(
        public.bookings.ground_id, 
        public.bookings.booking_date, 
        public.bookings.start_time, 
        auth.uid(), 
        public.bookings.id
    )
  )
);

-- 3. Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users and ground owners can update bookings" ON public.bookings;

-- 4. Create updated UPDATE policy with super admin override email check
CREATE POLICY "Users and ground owners can update bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.grounds 
    WHERE public.grounds.id = public.bookings.ground_id 
    AND public.grounds.owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
    AND public.profiles.role = 'super_admin'
  ) OR
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
)
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.grounds 
    WHERE public.grounds.id = public.bookings.ground_id 
    AND public.grounds.owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
    AND public.profiles.role = 'super_admin'
  ) OR
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
);
