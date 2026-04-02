-- Align start_time matching with how bookings are stored (minute precision; avoid strict
-- time equality issues). Case-insensitive notes match for "Teams: …" lines.

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
          when coalesce(b.notes, '') ilike '%Teams: Both Teams%' then 2
          when coalesce(b.notes, '') ilike '%Teams: 1 Team%' then 1
          else 2
        end
      )
      from public.bookings b
      join public.grounds g on g.id = b.ground_id
      where b.ground_id = p_ground_id
        and b.booking_date = p_booking_date
        and extract(hour from b.start_time) * 60 + extract(minute from b.start_time)
          = extract(hour from p_start_time) * 60 + extract(minute from p_start_time)
        and b.status not in ('cancelled', 'rejected')
        and lower(coalesce(g.pitch_type, '')) not like '%box%'
    ),
    0
  )::integer;
$$;
