/*
  # Occupancy Rate Calculation RPC
  
  This migration adds a database function to calculate the occupancy rate for a ground owner.
  Occupancy is calculated as: (Total Confirmed Bookings) / (Total Possible Slots based on time_slots template)
  Range: Last 30 days
*/

CREATE OR REPLACE FUNCTION public.get_owner_occupancy_rate(target_owner_id uuid)
RETURNS TABLE (
    total_bookings bigint,
    total_capacity bigint,
    occupancy_percentage numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    owner_ground_ids uuid[];
    weekly_slots_count bigint;
    monthly_capacity bigint;
    confirmed_bookings_count bigint;
BEGIN
    -- 1. Get all ground IDs owned by this user
    SELECT array_agg(id) INTO owner_ground_ids
    FROM public.grounds
    WHERE owner_id = target_owner_id;

    -- If no grounds, return zeros
    IF owner_ground_ids IS NULL OR array_length(owner_ground_ids, 1) = 0 THEN
        RETURN QUERY SELECT 
            0::bigint as total_bookings, 
            0::bigint as total_capacity, 
            0::numeric as occupancy_percentage;
        RETURN;
    END IF;

    -- 2. Calculate Weekly Capacity from time_slots template
    SELECT count(*) INTO weekly_slots_count
    FROM public.time_slots
    WHERE ground_id = ANY(owner_ground_ids);

    -- 3. Estimate Monthly Capacity (4 weeks)
    monthly_capacity := weekly_slots_count * 4;

    -- 4. Count Confirmed Bookings in the last 30 days
    -- Adjusting to look at all time confirmed bookings for a simple "all-time" or "current stats" view
    -- Or specifically last 30 days:
    SELECT count(*) INTO confirmed_bookings_count
    FROM public.bookings
    WHERE ground_id = ANY(owner_ground_ids)
      AND status = 'confirmed'
      AND booking_date >= (CURRENT_DATE - INTERVAL '30 days');

    -- 5. Calculate Percentage
    RETURN QUERY SELECT 
        confirmed_bookings_count,
        monthly_capacity,
        CASE 
            WHEN monthly_capacity > 0 THEN 
                LEAST(100, ROUND((confirmed_bookings_count::numeric / monthly_capacity::numeric) * 100, 2))
            ELSE 0 
        END as occupancy_percentage;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_owner_occupancy_rate(uuid) TO authenticated;
