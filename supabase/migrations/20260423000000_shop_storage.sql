-- 1. Create a public bucket for shop products
insert into storage.buckets (id, name, public)
values ('shop', 'shop', true)
on conflict (id) do nothing;

-- 2. Set up RLS policies for the 'shop' bucket

-- Cleanup existing policies if they exist to avoid name conflicts
drop policy if exists "Shop Public Access" on storage.objects;
drop policy if exists "Shop Admin Upload" on storage.objects;
drop policy if exists "Shop Admin Manage" on storage.objects;

-- Allow public to view product images
create policy "Shop Public Access"
on storage.objects for select
using ( bucket_id = 'shop' );

-- Allow authenticated admins to upload images
create policy "Shop Admin Upload"
on storage.objects for insert
with check (
  bucket_id = 'shop' 
  AND (auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
);

-- Allow authenticated admins to update/delete images
create policy "Shop Admin Manage"
on storage.objects for all
using (
  bucket_id = 'shop' 
  AND (auth.jwt() ->> 'email') = 'invirtualcoin@gmail.com'
);
