-- Bookable / filterable locations (city + state) managed by super admins.
-- Used by the landing booking form and can be extended for public browse filters.

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text not null,
  label text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_city_state_unique unique (city, state)
);

create index if not exists idx_locations_active_sort on public.locations (active, sort_order, city);

alter table public.locations enable row level security;

-- Anyone (including anon) can read active rows for public booking UI.
create policy "Public can view active locations"
  on public.locations
  for select
  to anon, authenticated
  using (active = true);

-- Super admins (and configured admin email) can read all rows.
create policy "Super admins can view all locations"
  on public.locations
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  );

create policy "Super admins can insert locations"
  on public.locations
  for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  );

create policy "Super admins can update locations"
  on public.locations
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  );

create policy "Super admins can delete locations"
  on public.locations
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  );

grant select on table public.locations to anon;
grant select, insert, update, delete on table public.locations to authenticated;

insert into public.locations (city, state, label, sort_order, active)
values
  ('New Delhi', 'Delhi', 'New Delhi, Delhi', 1, true),
  ('Gurugram', 'Haryana', 'Gurugram, Haryana', 2, true)
on conflict (city, state) do nothing;
