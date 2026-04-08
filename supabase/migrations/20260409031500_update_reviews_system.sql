-- Update Reviews RLS Policy
-- Drop existing policies first to avoid name collisions
DROP POLICY IF EXISTS "Users can insert reviews for their own completed bookings" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert reviews for their own past bookings" ON public.reviews;

-- New Policy: Allow reviews for completed games OR confirmed games in the past
CREATE POLICY "Users can insert reviews for their own past bookings"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = reviews.booking_id
      AND b.user_id = auth.uid()
      AND (
        b.status = 'completed' 
        OR (b.status = 'confirmed' AND b.booking_date < CURRENT_DATE)
      )
  )
);

-- Update Update Policy
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Adjust Unique Constraints
-- Remove the old restriction that allowed only one review per ground
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_ground_id_key;

-- Ensure one review per booking
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_booking_id_key;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_booking_id_key UNIQUE (user_id, booking_id);
