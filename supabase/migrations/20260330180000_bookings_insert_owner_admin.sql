-- Allow bookings to be created by:
-- 1) the customer (user_id = auth.uid()), as before
-- 2) the ground owner of that ground (e.g. booking on behalf of a patron)
-- 3) super admins (any ground / user_id)
-- Also allow the known admin email override used elsewhere in this project.

drop policy if exists "Users can create bookings" on public.bookings;

create policy "Users owners and super admins can create bookings"
  on public.bookings
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.grounds g
      where g.id = ground_id
        and g.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'super_admin'
    )
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  );
