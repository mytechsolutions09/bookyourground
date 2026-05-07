-- Add ticket_number column to contact_queries
ALTER TABLE public.contact_queries ADD COLUMN IF NOT EXISTS ticket_number text UNIQUE;

-- Create a sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS contact_queries_ticket_seq;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS trigger AS $$
DECLARE
    seq_val bigint;
    year_val text;
BEGIN
    IF NEW.ticket_number IS NULL THEN
        SELECT nextval('contact_queries_ticket_seq') INTO seq_val;
        SELECT to_char(CURRENT_DATE, 'YYYY') INTO year_val;
        NEW.ticket_number := 'BYGTKT' || year_val || LPAD(seq_val::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
DROP TRIGGER IF EXISTS tr_generate_ticket_number ON public.contact_queries;
CREATE TRIGGER tr_generate_ticket_number
BEFORE INSERT ON public.contact_queries
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- Backfill existing tickets
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, created_at FROM public.contact_queries WHERE ticket_number IS NULL OR ticket_number LIKE '%-%' ORDER BY created_at ASC LOOP
        UPDATE public.contact_queries 
        SET ticket_number = 'BYGTKT' || to_char(r.created_at, 'YYYY') || LPAD(nextval('contact_queries_ticket_seq')::text, 4, '0')
        WHERE id = r.id;
    END LOOP;
END $$;
