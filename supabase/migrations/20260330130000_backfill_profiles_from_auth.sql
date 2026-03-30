/*
  Backfill missing `public.profiles` rows from `auth.users`.

  Reason:
  - The app expects every authenticated user to have a row in `profiles`
    (full_name is NOT NULL, and many screens query `profiles`).
  - If some users were created before the profile trigger existed (or the
    trigger didn't run), `profiles` can be empty, which makes Admin "Manage
    Users" show 0 rows.
*/

insert into public.profiles (id, role, full_name)
select
  u.id,
  case
    when lower(u.email) = 'invirtualcoin@gmail.com' then 'super_admin'::public.user_role
    else 'user'::public.user_role
  end as role,
  coalesce(u.raw_user_meta_data->>'full_name', 'User') as full_name
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

