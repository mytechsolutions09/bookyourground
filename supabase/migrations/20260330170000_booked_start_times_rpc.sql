-- Expose only booked start times for a ground+day (for public availability UI).
-- Does not leak booking rows to anonymous users.

create or replace function public.booked_start_times_for_ground_day(
  p_ground_id uuid,
  p_booking_date date
)
returns table (start_time time)
language sql
stable
security definer
set search_path = public
as $$
  select b.start_time
  from public.bookings b
  where b.ground_id = p_ground_id
    and b.booking_date = p_booking_date
    and b.status not in ('cancelled', 'rejected');
$$;

revoke all on function public.booked_start_times_for_ground_day(uuid, date) from public;
grant execute on function public.booked_start_times_for_ground_day(uuid, date) to anon, authenticated;
