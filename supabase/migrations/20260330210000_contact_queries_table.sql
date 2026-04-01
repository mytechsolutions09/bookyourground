/*
  # Contact queries table for support

  Stores messages submitted from the public Contact form so super admins
  can review them in the admin Support settings section.
*/

-- Create contact_queries table
CREATE TABLE IF NOT EXISTS public.contact_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- optional link to a logged-in profile, if available on the client
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- who is contacting us
  role user_role, -- 'user' | 'ground_owner' | 'super_admin' (nullable for anonymous)

  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,

  -- admin handling state
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Basic index for listing / filtering
CREATE INDEX IF NOT EXISTS idx_contact_queries_created_at
  ON public.contact_queries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_queries_resolved
  ON public.contact_queries(resolved, created_at DESC);

-- Enable RLS
ALTER TABLE public.contact_queries ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon or authenticated) to create a contact query
CREATE POLICY "Anyone can create contact queries"
  ON public.contact_queries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only super admins can view all contact queries
CREATE POLICY "Super admins can view all contact queries"
  ON public.contact_queries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Only super admins can update contact queries (e.g. mark resolved)
CREATE POLICY "Super admins can update contact queries"
  ON public.contact_queries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

