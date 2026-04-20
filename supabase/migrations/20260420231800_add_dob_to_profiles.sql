-- migrations/20260420231800_add_dob_to_profiles.sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dob TEXT;
