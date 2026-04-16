-- migration to allow users to see their opponents in matchmaking slots
-- this fixes the "My Matches" page and enables match detection in "My Bookings"

DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

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
  (
    public.bookings.status = 'confirmed' AND
    EXISTS (
      SELECT 1 FROM public.bookings b2
      WHERE b2.ground_id = public.bookings.ground_id
      AND b2.booking_date = public.bookings.booking_date
      AND b2.start_time = public.bookings.start_time
      AND b2.user_id = auth.uid()
      AND b2.status = 'confirmed'
      AND b2.id != public.bookings.id
    )
  )
);
