-- How many team slots (0–2) are already used for this cricket ground + date + start time.
-- Used by the booking UI to hide "Both Teams" when only one slot remains (e.g. one "1 Team" booking).
-- Box cricket: always 0 (team toggle not used). Same notes rules as other booking RPCs.

create or replace function public.cricket_team_slots_used_for_slot(
  p_ground_id uuid,
  p_booking_date date,
  p_start_time time
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select sum(
        case
          when coalesce(b.notes, '') like '%Teams: Both Teams%' then 2
          when coalesce(b.notes, '') like '%Teams: 1 Team%' then 1
          else 2
        end
      )
      from public.bookings b
      join public.grounds g on g.id = b.ground_id
      where b.ground_id = p_ground_id
        and b.booking_date = p_booking_date
        and b.start_time = p_start_time
        and b.status not in ('cancelled', 'rejected')
        and lower(coalesce(g.pitch_type, '')) not like '%box%'
    ),
    0
  )::integer;
$$;

revoke all on function public.cricket_team_slots_used_for_slot(uuid, date, time) from public;
grant execute on function public.cricket_team_slots_used_for_slot(uuid, date, time) to anon, authenticated;
