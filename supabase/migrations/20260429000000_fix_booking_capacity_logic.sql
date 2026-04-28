-- Fix booking capacity logic to support team_type column and robust time matching.

-- Ensure team_type column exists (might be missing in some environments)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='bookings' AND column_name='team_type') THEN
        ALTER TABLE public.bookings ADD COLUMN team_type text;
    END IF;
END $$;

-- 1. available_ground_ids_for_slot
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
      and extract(hour from b.start_time) * 60 + extract(minute from b.start_time)
        = extract(hour from p_start_time) * 60 + extract(minute from p_start_time)
      and b.status not in ('cancelled', 'rejected')
    group by b.ground_id, g.pitch_type
    having case
      when lower(coalesce(g.pitch_type, '')) like '%box%' then
        count(*) filter (where b.status in ('confirmed', 'completed')) > 0
      else coalesce(
        sum(
          case
            when b.team_type = 'both' then 2
            when b.team_type = 'one' then 1
            when coalesce(b.notes, '') ilike '%Teams: Both Teams%' then 2
            when coalesce(b.notes, '') ilike '%Teams: 1 Team%' then 1
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
      and extract(hour from ts.start_time) * 60 + extract(minute from ts.start_time)
        = extract(hour from p_start_time) * 60 + extract(minute from p_start_time)
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

-- 2. booked_start_times_for_ground_day
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
  select (date_trunc('minute', b.start_time))::time as start_time
  from public.bookings b
  join public.grounds g
    on g.id = b.ground_id
  where b.ground_id = p_ground_id
    and b.booking_date = p_booking_date
    and b.status not in ('cancelled', 'rejected')
  group by (date_trunc('minute', b.start_time))::time, g.pitch_type
  having case
    when lower(coalesce(g.pitch_type, '')) like '%box%' then
      count(*) filter (where b.status in ('confirmed', 'completed')) > 0
    else coalesce(
      sum(
        case
          when b.team_type = 'both' then 2
          when b.team_type = 'one' then 1
          when coalesce(b.notes, '') ilike '%Teams: Both Teams%' then 2
          when coalesce(b.notes, '') ilike '%Teams: 1 Team%' then 1
          else 2
        end
      ),
      0
    ) >= 2
  end;
$$;

-- 3. cricket_team_slots_used_for_slot
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
          when b.team_type = 'both' then 2
          when b.team_type = 'one' then 1
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
