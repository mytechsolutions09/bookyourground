-- migration to fix infinite recursion in bookings policy
-- This occurs when a policy for a table queries that same table in its USING clause

-- 1. Create a security definer function to bypass RLS for the overlapping booking check
CREATE OR REPLACE FUNCTION public.check_user_has_booking_at_slot(
    target_ground_id UUID, 
    target_date DATE, 
    target_start_time TIME, 
    target_user_id UUID, 
    exclude_booking_id UUID
) 
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.bookings
        WHERE ground_id = target_ground_id
        AND booking_date = target_date
        AND start_time = target_start_time
        AND user_id = target_user_id
        AND status = 'confirmed'
        AND id != exclude_booking_id
    );
$$;

-- 2. Update the policy to use the non-recursive function
DROP POLICY IF EXISTS "Users can view own bookings and matched opponents" ON public.bookings;

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
    public.check_user_has_booking_at_slot(
        public.bookings.ground_id, 
        public.bookings.booking_date, 
        public.bookings.start_time, 
        auth.uid(), 
        public.bookings.id
    )
  )
);
