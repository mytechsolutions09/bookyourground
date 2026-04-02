-- Box cricket: reserve a start time only after a booking is accepted or finished.
-- Pending requests do not block the slot (owner can confirm one booking without others
-- holding the slot). Cricket-ground 2-team logic is unchanged.

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
    select b.ground_id
    from public.bookings b
    join candidates c on c.ground_id = b.ground_id
    join public.grounds g on g.id = b.ground_id
    where b.booking_date = p_booking_date
      and b.start_time = p_start_time
      and b.status not in ('cancelled', 'rejected')
    group by b.ground_id, g.pitch_type
    having case
      when lower(coalesce(g.pitch_type, '')) like '%box%' then
        count(*) filter (where b.status in ('confirmed', 'completed')) > 0
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
  join public.grounds g
    on g.id = b.ground_id
  where b.ground_id = p_ground_id
    and b.booking_date = p_booking_date
    and b.status not in ('cancelled', 'rejected')
  group by b.start_time, g.pitch_type
  having case
    when lower(coalesce(g.pitch_type, '')) like '%box%' then
      count(*) filter (where b.status in ('confirmed', 'completed')) > 0
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
  end;
$$;

revoke all on function public.available_ground_ids_for_slot(uuid[], date, time) from public;
grant execute on function public.available_ground_ids_for_slot(uuid[], date, time) to anon, authenticated;

revoke all on function public.booked_start_times_for_ground_day(uuid, date) from public;
grant execute on function public.booked_start_times_for_ground_day(uuid, date) to anon, authenticated;
