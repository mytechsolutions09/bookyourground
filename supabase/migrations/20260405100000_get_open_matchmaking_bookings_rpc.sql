-- Function to find open matchmaking slots across all grounds for a given day or onwards.
-- An "open" slot is defined as a (ground, date, time) combination that has exactly ONE team slot used
-- (i.e., a "1 Team" booking) and no other confirmed/pending bookings.

create or replace function public.get_open_matchmaking_bookings(
  p_today date
)
returns setof public.bookings
language sql
stable
security definer
set search_path = public
as $$
  /*
    Identify the (ground_id, booking_date, start_time) combinations that have exactly 1 team slot used.
  */
  with slot_usage as (
    select 
      b.ground_id, 
      b.booking_date, 
      b.start_time,
      sum(
        case
          when coalesce(b.notes, '') like '%Teams: Both Teams%' then 2
          when coalesce(b.notes, '') like '%Teams: 1 Team%' then 1
          else 2
        end
      ) as total_teams
    from public.bookings b
    join public.grounds g on g.id = b.ground_id
    where b.booking_date >= p_today
      and b.status not in ('cancelled', 'rejected')
      and lower(coalesce(g.pitch_type, '')) not like '%box%'
    group by b.ground_id, b.booking_date, b.start_time
    having sum(
        case
          when coalesce(b.notes, '') like '%Teams: Both Teams%' then 2
          when coalesce(b.notes, '') like '%Teams: 1 Team%' then 1
          else 2
        end
      ) = 1
  )
  /*
    Return the actual booking records for those slots.
  */
  select b.*
  from public.bookings b
  join slot_usage su 
    on  su.ground_id = b.ground_id 
    and su.booking_date = b.booking_date 
    and su.start_time = b.start_time
  where b.status not in ('cancelled', 'rejected');
$$;

-- Permissions
revoke all on function public.get_open_matchmaking_bookings(date) from public;
grant execute on function public.get_open_matchmaking_bookings(date) to anon, authenticated;
