-- Migration: allow super_admin to insert profiles directly and allow virtual profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DROP POLICY IF EXISTS "Super admins can insert any profile" ON public.profiles;
CREATE POLICY "Super admins can insert any profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
