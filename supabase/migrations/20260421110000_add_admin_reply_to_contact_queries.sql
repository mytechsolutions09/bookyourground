/*
  # Add Admin Reply to Contact Queries
  
  1. Changes
    - Add `admin_reply` text column to `contact_queries`
    - Add `replied_at` timestamptz column
    - Add `replied_by` uuid column (references profiles.id)
*/

ALTER TABLE public.contact_queries 
ADD COLUMN IF NOT EXISTS admin_reply text,
ADD COLUMN IF NOT EXISTS replied_at timestamptz,
ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES public.profiles(id);

-- Refresh index including replied status
CREATE INDEX IF NOT EXISTS idx_contact_queries_replied ON public.contact_queries(replied_at) WHERE replied_at IS NOT NULL;
