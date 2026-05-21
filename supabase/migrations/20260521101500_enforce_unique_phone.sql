-- Create a unique constraint on the phone number column in the profiles table
-- Nulls are inherently treated as distinct in PostgreSQL, so multiple nulls are allowed

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
