-- Create contact_queries table
CREATE TABLE IF NOT EXISTS public.contact_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Links to a logged-in profile if they were signed in
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- User role for context
  role user_role, 

  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,

  -- Admin management state
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_contact_queries_created_at ON public.contact_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_queries_resolved ON public.contact_queries(resolved, created_at DESC);

-- Security setup
ALTER TABLE public.contact_queries ENABLE ROW LEVEL SECURITY;

-- Safely create policies using a DO block
DO $$ 
BEGIN
    -- 1. Submission: Anyone can create a query
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can create contact queries' AND tablename = 'contact_queries'
    ) THEN
        CREATE POLICY "Anyone can create contact queries"
          ON public.contact_queries FOR INSERT
          TO anon, authenticated WITH CHECK (true);
    END IF;

    -- 2. User View: Logged-in users can see their own history
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own contact queries' AND tablename = 'contact_queries'
    ) THEN
        CREATE POLICY "Users can view their own contact queries"
          ON public.contact_queries FOR SELECT
          TO authenticated USING (auth.uid() = profile_id);
    END IF;

    -- 3. Super Admin View: Full access to all tickets
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can view all contact queries' AND tablename = 'contact_queries'
    ) THEN
        CREATE POLICY "Super admins can view all contact queries"
          ON public.contact_queries FOR SELECT
          TO authenticated USING (
            EXISTS (
              SELECT 1 FROM public.profiles p 
              WHERE p.id = auth.uid() AND p.role = 'super_admin'
            )
          );
    END IF;

    -- 4. Super Admin Manage: Ability to mark tickets as resolved
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can update contact queries' AND tablename = 'contact_queries'
    ) THEN
        CREATE POLICY "Super admins can update contact queries"
          ON public.contact_queries FOR UPDATE
          TO authenticated USING (
            EXISTS (
              SELECT 1 FROM public.profiles p 
              WHERE p.id = auth.uid() AND p.role = 'super_admin'
            )
          );
    END IF;
END $$;
