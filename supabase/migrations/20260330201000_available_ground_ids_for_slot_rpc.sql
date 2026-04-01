-- Return the subset of grounds that are available for a given date + start_time.
-- Uses SECURITY DEFINER so it can be called by anon/authenticated without leaking booking rows.
-- Respects:
-- - Existing bookings (blocks statuses other than cancelled/rejected)
-- - Configured `time_slots.is_available` for the ground/day (if time_slots exist for that ground/day)

create or replace function public.available_ground_ids_for_slot(
  p_ground_ids uuid[],
  p_booking_date date,
  p_start_time time
)
returns table (ground_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with candidates as (
    select unnest(p_ground_ids) as ground_id
  ),
  dow as (
    select extract(isodow from p_booking_date)::int as isodow
  ),
  day_name as (
    select case (select isodow from dow)
      when 1 then 'monday'::public.day_of_week
      when 2 then 'tuesday'::public.day_of_week
      when 3 then 'wednesday'::public.day_of_week
      when 4 then 'thursday'::public.day_of_week
      when 5 then 'friday'::public.day_of_week
      when 6 then 'saturday'::public.day_of_week
      else 'sunday'::public.day_of_week
    end as day_of_week
  ),
  booked as (
    /*
      For box cricket:
        - Any non-cancelled/rejected booking at that start_time blocks the ground.

      For regular cricket grounds:
        - Each slot has capacity for 2 teams.
        - A booking for "Both Teams" consumes 2 team slots.
        - A booking for "1 Team" consumes 1 team slot.
        - We treat the ground as booked for this slot only when total team capacity
          used for that slot is >= 2.
        - Team information is inferred from the standardized notes prefix that
          the app writes:
            - 'Teams: 1 Team'
            - 'Teams: Both Teams'
          Any other value (or missing notes) defaults to 2 teams.
    */
    select b.ground_id
    from public.bookings b
    join candidates c on c.ground_id = b.ground_id
    join public.grounds g on g.id = b.ground_id
    where b.booking_date = p_booking_date
      and b.start_time = p_start_time
      and b.status not in ('cancelled', 'rejected')
    group by b.ground_id, g.pitch_type
    having case
      -- Box cricket: any active booking blocks the slot.
      when lower(coalesce(g.pitch_type, '')) like '%box%' then count(*) > 0
      -- Cricket ground: capacity is 2 teams per slot.
      else coalesce(
        sum(
          case
            when coalesce(b.notes, '') like '%Teams: Both Teams%' then 2
            when coalesce(b.notes, '') like '%Teams: 1 Team%' then 1
            else 2
          end
        ),
        0
      ) >= 2
    end
  ),
  has_slots as (
    select ts.ground_id, count(*) as cnt
    from public.time_slots ts
    join candidates c on c.ground_id = ts.ground_id
    where ts.day_of_week = (select day_of_week from day_name)
    group by ts.ground_id
  ),
  allowed_by_slots as (
    -- Only grounds that have at least one time_slots row for that day are constrained.
    select ts.ground_id
    from public.time_slots ts
    join candidates c on c.ground_id = ts.ground_id
    where ts.day_of_week = (select day_of_week from day_name)
      and ts.start_time = p_start_time
      and ts.is_available = true
  )
  select c.ground_id
  from candidates c
  left join booked b on b.ground_id = c.ground_id
  left join has_slots hs on hs.ground_id = c.ground_id
  left join allowed_by_slots abs on abs.ground_id = c.ground_id
  where b.ground_id is null
    and (
      hs.cnt is null
      or abs.ground_id is not null
    );
$$;

revoke all on function public.available_ground_ids_for_slot(uuid[], date, time) from public;
grant execute on function public.available_ground_ids_for_slot(uuid[], date, time) to anon, authenticated;

