-- Fix foreign key constraints for user deletion
-- This adds ON DELETE CASCADE/SET NULL to missing foreign keys referencing profiles

-- 1. wallet_transactions
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_user_id_fkey;
ALTER TABLE public.wallet_transactions 
ADD CONSTRAINT wallet_transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 2. coupons (owner_id)
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_owner_id_fkey;
ALTER TABLE public.coupons 
ADD CONSTRAINT coupons_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 3. contact_queries (replied_by)
ALTER TABLE public.contact_queries DROP CONSTRAINT IF EXISTS contact_queries_replied_by_fkey;
ALTER TABLE public.contact_queries 
ADD CONSTRAINT contact_queries_replied_by_fkey 
FOREIGN KEY (replied_by) REFERENCES public.profiles(id) 
ON DELETE SET NULL;
