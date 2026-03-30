-- Ground / pitch types (e.g. Cricket Ground, Box Cricket) for filters and booking UI.

create table if not exists public.ground_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  label text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ground_types_name_unique unique (name)
);

create index if not exists idx_ground_types_active_sort on public.ground_types (active, sort_order, name);

alter table public.ground_types enable row level security;

create policy "Public can view active ground types"
  on public.ground_types
  for select
  to anon, authenticated
  using (active = true);

create policy "Super admins can view all ground types"
  on public.ground_types
  for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  );

create policy "Super admins can insert ground types"
  on public.ground_types
  for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  );

create policy "Super admins can update ground types"
  on public.ground_types
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

create policy "Super admins can delete ground types"
  on public.ground_types
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'invirtualcoin@gmail.com'
  );

grant select on table public.ground_types to anon;
grant select, insert, update, delete on table public.ground_types to authenticated;

insert into public.ground_types (name, label, sort_order, active)
values
  ('Cricket Ground', 'Cricket Ground', 1, true),
  ('Box Cricket', 'Box Cricket', 2, true)
on conflict (name) do nothing;
