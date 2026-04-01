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
  /*
    For box cricket:
      - Any non-cancelled/rejected booking blocks the slot completely.

    For regular cricket grounds:
      - Each slot has capacity for 2 teams.
      - A booking for "Both Teams" consumes 2 team slots.
      - A booking for "1 Team" consumes 1 team slot.
      - We only consider a start_time fully booked (and thus return it) when
        the total team capacity used for that slot is >= 2.
      - Team information is inferred from the standardized notes prefix that
        the app writes:
          - 'Teams: 1 Team'
          - 'Teams: Both Teams'
        Any other value (or missing notes) defaults to 2 teams.
  */
  select b.start_time
  from public.bookings b
  join public.grounds g
    on g.id = b.ground_id
  where b.ground_id = p_ground_id
    and b.booking_date = p_booking_date
    and b.status not in ('cancelled', 'rejected')
  group by b.start_time, g.pitch_type
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
  end;
$$;

revoke all on function public.booked_start_times_for_ground_day(uuid, date) from public;
grant execute on function public.booked_start_times_for_ground_day(uuid, date) to anon, authenticated;
