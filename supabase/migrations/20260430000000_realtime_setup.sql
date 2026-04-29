-- 1. Enable Realtime for key tables
-- This allows the client to listen for changes (INSERT/UPDATE/DELETE)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Create a demo function to "send" a realtime message from the database
-- In Supabase, any INSERT/UPDATE on a tracked table is a "realtime message"
-- This function simulates a system notification
CREATE OR REPLACE FUNCTION public.send_system_notification(
    target_user_id UUID,
    notif_title TEXT,
    notif_message TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, read)
    VALUES (target_user_id, notif_title, notif_message, 'system', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Example of an Edge-trigger-like behavior in Postgres
-- This trigger will automatically notify a user when their booking status changes
CREATE OR REPLACE FUNCTION public.on_booking_status_change_notify()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Booking ' || NEW.status,
            'Your booking for ground ' || (SELECT name FROM grounds WHERE id = NEW.ground_id) || ' is now ' || NEW.status,
            'booking_update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_booking_status_change ON public.bookings;
CREATE TRIGGER tr_on_booking_status_change
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.on_booking_status_change_notify();

-- Comment: To "send your first message" from the database, you can now run:
-- SELECT public.send_system_notification('USER_UUID', 'Welcome!', 'This is a realtime message from your database!');
