/*
    # Custom Serial ID Generation
    
    Implementation of custom identifier in the format: BYG-[YEAR]-[NUMBER]
    Example: BYG-2026-0001
    
    - Resets/Increments per year
    - Formats numbers with leading zeros (minimum 4 digits)
*/

-- 1. Add the column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS serial_id text UNIQUE;

-- 2. Create the sequence generator function
CREATE OR REPLACE FUNCTION public.get_next_byg_id()
RETURNS trigger AS $$
DECLARE
    current_year int;
    next_num int;
    year_prefix text;
BEGIN
    -- Use the created_at year, or current year as fallback
    current_year := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()));
    year_prefix := 'BYG-' || current_year || '-%';
    
    -- Find the next number for this specific year
    -- We parse the last part of the string as an integer
    SELECT COALESCE(
        MAX(
            CAST(substring(serial_id from 'BYG-[0-9]{4}-([0-9]+)') AS int)
        ), 0) + 1
    INTO next_num
    FROM public.profiles
    WHERE serial_id LIKE year_prefix;
    
    -- Format: BYG-2026-0001 (LPAD to 4 digits, matches requirements)
    NEW.serial_id := 'BYG-' || current_year || '-' || LPAD(next_num::text, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS tr_add_serial_id ON public.profiles;
CREATE TRIGGER tr_add_serial_id
    BEFORE INSERT ON public.profiles
    FOR EACH ROW 
    WHEN (NEW.serial_id IS NULL)
    EXECUTE FUNCTION public.get_next_byg_id();

-- 4. Backfill existing profiles
-- This uses a window function to assign numbers to existing users based on their creation date
DO $$
BEGIN
    WITH numbered_profiles AS (
        SELECT id, created_at,
               row_number() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at) as num
        FROM public.profiles
        WHERE serial_id IS NULL
    )
    UPDATE public.profiles p
    SET serial_id = 'BYG-' || EXTRACT(YEAR FROM p.created_at) || '-' || LPAD(np.num::text, 4, '0')
    FROM numbered_profiles np
    WHERE p.id = np.id;
END $$;
