-- Allow super_admin users to manage `time_slots` (days/slots availability).
-- Needed because the default "Ground owners can manage own ground time slots" policy
-- only grants access based on `grounds.owner_id = auth.uid()`.

create policy "Super admins can manage time slots"
  on time_slots
  for all
  to authenticated
  using (
    exists (
      select 1
      from grounds g
      where g.id = time_slots.ground_id
        and (
          g.owner_id = auth.uid()
          or exists (
            select 1
            from profiles p
            where p.id = auth.uid()
              and p.role = 'super_admin'
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from grounds g
      where g.id = time_slots.ground_id
        and (
          g.owner_id = auth.uid()
          or exists (
            select 1
            from profiles p
            where p.id = auth.uid()
              and p.role = 'super_admin'
          )
        )
    )
  );

