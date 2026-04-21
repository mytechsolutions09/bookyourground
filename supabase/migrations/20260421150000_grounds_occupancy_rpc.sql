/*
  # Ground-level Occupancy Rate RPC
  
  This migration adds a database function to calculate occupancy rates for ALL grounds owned by an owner at once.
*/

CREATE OR REPLACE FUNCTION public.get_owner_grounds_occupancy(target_owner_id uuid)
RETURNS TABLE (
    ground_id uuid,
    occupancy_percentage numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ground_slots AS (
        -- Count defined slots per ground
        SELECT ts.ground_id, count(*) as weekly_slots
        FROM public.time_slots ts
        JOIN public.grounds g ON g.id = ts.ground_id
        WHERE g.owner_id = target_owner_id
        GROUP BY ts.ground_id
    ),
    ground_bookings AS (
        -- Count confirmed bookings per ground in last 30 days
        SELECT b.ground_id, count(*) as confirmed_count
        FROM public.bookings b
        JOIN public.grounds g ON g.id = b.ground_id
        WHERE g.owner_id = target_owner_id
          AND b.status = 'confirmed'
          AND b.booking_date >= (CURRENT_DATE - INTERVAL '30 days')
        GROUP BY b.ground_id
    )
    SELECT 
        g.id as ground_id,
        CASE 
            WHEN COALESCE(gs.weekly_slots, 0) > 0 THEN 
                LEAST(100, ROUND((COALESCE(gb.confirmed_count, 0)::numeric / (gs.weekly_slots * 4)::numeric) * 100, 2))
            ELSE 0 
        END as occupancy_percentage
    FROM public.grounds g
    LEFT JOIN ground_slots gs ON gs.ground_id = g.id
    LEFT JOIN ground_bookings gb ON gb.ground_id = g.id
    WHERE g.owner_id = target_owner_id;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_owner_grounds_occupancy(uuid) TO authenticated;
