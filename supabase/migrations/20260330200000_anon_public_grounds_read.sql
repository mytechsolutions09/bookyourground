-- Allow anonymous users to read public ground data for the landing / search booking flow.
-- Without this, `grounds` returns 0 rows for `anon` and Search never enables.

grant select on table public.grounds to anon;
grant select on table public.ground_images to anon;
grant select on table public.time_slots to anon;

create policy "Public (anon) can view approved active grounds"
  on public.grounds
  for select
  to anon
  using (approved = true and active = true);

create policy "Public (anon) can view images for approved active grounds"
  on public.ground_images
  for select
  to anon
  using (
    exists (
      select 1
      from public.grounds g
      where g.id = ground_id
        and g.approved = true
        and g.active = true
    )
  );

create policy "Public (anon) can view time slots for approved active grounds"
  on public.time_slots
  for select
  to anon
  using (
    exists (
      select 1
      from public.grounds g
      where g.id = ground_id
        and g.approved = true
        and g.active = true
    )
  );
