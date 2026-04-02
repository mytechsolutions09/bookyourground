/*
  Add has_washrooms amenity flag

  Used to let ground owners specify if the ground has washrooms/toilets.
*/

ALTER TABLE public.grounds
ADD COLUMN IF NOT EXISTS has_washrooms boolean NOT NULL DEFAULT false;

