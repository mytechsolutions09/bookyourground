-- 1. Create a function to handle booking cancellations (Refunds + Notifications + Revenue Reversal)
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation()
RETURNS trigger AS $$
DECLARE
    v_host text;
    v_service_role_key text;
    v_owner_id uuid;
BEGIN
    -- Check if status changed to 'cancelled'
    IF (OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled') THEN
        
        -- A. AUTOMATED REFUND TO USER (if not cash and payment was online)
        IF (NEW.payment_method IS DISTINCT FROM 'cash' AND NEW.total_charged > 0) THEN
            PERFORM public.process_wallet_transaction(
                NEW.user_id,
                NEW.total_charged,
                'refund',
                'Refund for cancelled booking #' || substring(NEW.id::text, 1, 8) || ' at ' || (SELECT name FROM grounds WHERE id = NEW.ground_id),
                NEW.id
            );

            -- B. REVENUE REVERSAL FROM OWNER
            -- We only reverse if the owner was likely credited (i.e. status was confirmed/completed)
            IF (OLD.status IN ('confirmed', 'completed') AND NEW.owner_settlement > 0) THEN
                SELECT owner_id INTO v_owner_id FROM grounds WHERE id = NEW.ground_id;
                IF v_owner_id IS NOT NULL THEN
                    PERFORM public.process_wallet_transaction(
                        v_owner_id,
                        -NEW.owner_settlement,
                        'used',
                        'Revenue reversal for cancelled booking #' || substring(NEW.id::text, 1, 8),
                        NEW.id
                    );
                END IF;
            END IF;
        END IF;

        -- C. SEND EMAIL NOTIFICATION
        -- We reuse the existing notification infrastructure
        -- v_host := COALESCE((current_setting('request.headers', true)::jsonb)->>'host', 'localhost');
        -- In edge functions environment, we might need a more reliable way to get the host, 
        -- but for Supabase triggers, we usually hardcode or use environment vars if available.
        -- Since this runs in the DB, we'll try to get it from headers or use a default.
        
        BEGIN
            v_host := (current_setting('request.headers', true)::jsonb)->>'host';
        EXCEPTION WHEN OTHERS THEN
            v_host := 'bookyourground.com'; -- Fallback
        END;

        v_service_role_key := COALESCE(current_setting('app.settings.service_role_key', true), '');

        -- Trigger the email edge function
        -- We use pg_net for asynchronous non-blocking call
        PERFORM
            net.http_post(
                url := 'https://' || COALESCE(v_host, 'localhost:54321') || '/functions/v1/send-booking-confirmation',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || v_service_role_key
                ),
                body := jsonb_build_object(
                    'type', 'UPDATE',
                    'table', 'bookings',
                    'record', row_to_json(NEW),
                    'old_record', row_to_json(OLD)
                )
            );
            
        -- Set cancelled_at if not set
        IF NEW.cancelled_at IS NULL THEN
            NEW.cancelled_at := now();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger for cancellations
DROP TRIGGER IF EXISTS on_booking_cancelled ON public.bookings;
CREATE TRIGGER on_booking_cancelled
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION public.handle_booking_cancellation();

-- 3. Update the existing creation trigger to handle both INSERT and UPDATE (for notifications)
-- The creation trigger remains AFTER INSERT.

CREATE OR REPLACE FUNCTION public.handle_booking_notification()
RETURNS trigger AS $$
DECLARE
    v_host text;
    v_service_role_key text;
BEGIN
    BEGIN
        v_host := (current_setting('request.headers', true)::jsonb)->>'host';
    EXCEPTION WHEN OTHERS THEN
        v_host := 'bookyourground.com'; -- Fallback
    END;
    
    v_service_role_key := COALESCE(current_setting('app.settings.service_role_key', true), '');

    PERFORM
        net.http_post(
            url := 'https://' || COALESCE(v_host, 'localhost:54321') || '/functions/v1/send-booking-confirmation',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_service_role_key
            ),
            body := jsonb_build_object(
                'type', TG_OP,
                'table', 'bookings',
                'record', row_to_json(NEW)
            )
        );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply creation trigger
DROP TRIGGER IF EXISTS on_booking_created_notification ON public.bookings;
CREATE TRIGGER on_booking_created_notification
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_booking_notification();
