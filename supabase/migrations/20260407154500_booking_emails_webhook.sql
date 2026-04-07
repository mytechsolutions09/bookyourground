-- Enable the "pg_net" extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Set up a function that calls your Supabase Edge Function
CREATE OR REPLACE FUNCTION public.handle_new_booking_email()
RETURNS trigger AS $$
BEGIN
  -- We call the Edge Function at "send-booking-confirmation"
  -- Replace <YOUR_PROJECT_REF> with your actual project reference ID 
  -- when applying this via the Supabase dashboard.
  -- Use COALESCE and true flag to handle cases where headers might be missing (e.g. dashboard inserts)
  PERFORM
    net.http_post(
      url := 'https://' || COALESCE((current_setting('request.headers', true)::jsonb)->>'host', 'localhost') || '/functions/v1/send-booking-confirmation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), 'MISSING_KEY')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'bookings',
        'record', row_to_json(NEW)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function after each insert on the bookings table
DROP TRIGGER IF EXISTS on_booking_created_email ON public.bookings;
CREATE TRIGGER on_booking_created_email
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking_email();
