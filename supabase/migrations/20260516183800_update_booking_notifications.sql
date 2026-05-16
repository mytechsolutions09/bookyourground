CREATE OR REPLACE FUNCTION public.on_booking_status_change_notify()
RETURNS TRIGGER AS $$
DECLARE
    v_ground_name TEXT;
    v_owner_id UUID;
    v_user_name TEXT;
    v_opponent_user_id UUID;
BEGIN
    -- Fetch ground and owner info
    SELECT name, owner_id INTO v_ground_name, v_owner_id FROM grounds WHERE id = NEW.ground_id;
    -- Fetch player name
    SELECT full_name INTO v_user_name FROM profiles WHERE id = NEW.user_id;

    IF (TG_OP = 'INSERT') THEN
        -- 1. Notification for the PLAYER
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'Booking Confirmed',
            'Your booking #' || UPPER(substring(NEW.id::text, 1, 8)) || ' for ground ' || COALESCE(v_ground_name, 'your ground') || ' is successfully confirmed.',
            'booking_update',
            jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
        );

        -- 2. Notification for the OWNER
        IF v_owner_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, data)
            VALUES (
                v_owner_id,
                'New Booking Received',
                'New booking #' || UPPER(substring(NEW.id::text, 1, 8)) || ' received for ' || COALESCE(v_ground_name, 'your ground') || ' from ' || COALESCE(v_user_name, 'a player') || '.',
                'booking_update',
                jsonb_build_object('booking_id', NEW.id, 'status', NEW.status, 'role', 'owner')
            );
        END IF;

        -- 3. Notification for EXISTING PLAYER (Matchmaking / Opponent Joined)
        -- Check if there's already another booking for the same slot
        SELECT user_id INTO v_opponent_user_id 
        FROM public.bookings 
        WHERE ground_id = NEW.ground_id 
          AND booking_date = NEW.booking_date 
          AND start_time = NEW.start_time
          AND status = 'confirmed'
          AND id != NEW.id
        LIMIT 1;

        IF v_opponent_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, data)
            VALUES (
                v_opponent_user_id,
                'Match Found!',
                'An opponent has joined your match at ' || COALESCE(v_ground_name, 'the ground') || ' on ' || NEW.booking_date || '. Get ready!',
                'matchmaking_update',
                jsonb_build_object('booking_id', NEW.id, 'opponent_id', NEW.user_id)
            );
        END IF;

    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        -- 1. Notification for the PLAYER
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'Booking ' || INITCAP(NEW.status),
            'Your booking #' || UPPER(substring(NEW.id::text, 1, 8)) || ' for ground ' || COALESCE(v_ground_name, 'your ground') || ' is now ' || NEW.status,
            'booking_update',
            jsonb_build_object('booking_id', NEW.id, 'status', NEW.status)
        );

        -- 2. Notification for the OWNER (specifically for cancellations)
        IF v_owner_id IS NOT NULL AND NEW.status = 'cancelled' THEN
            INSERT INTO public.notifications (user_id, title, message, type, data)
            VALUES (
                v_owner_id,
                'Booking Cancelled',
                'Booking #' || UPPER(substring(NEW.id::text, 1, 8)) || ' for ' || COALESCE(v_ground_name, 'your ground') || ' has been cancelled by the player.',
                'booking_update',
                jsonb_build_object('booking_id', NEW.id, 'status', NEW.status, 'role', 'owner')
            );
        END IF;

        -- 3. Review Reminder for the PLAYER (specifically for completed matches)
        IF NEW.status = 'completed' THEN
            INSERT INTO public.notifications (user_id, title, message, type, data)
            VALUES (
                NEW.user_id,
                'How was the game?',
                'Hope you enjoyed your session at ' || COALESCE(v_ground_name, 'the ground') || '! Leave a review to help others.',
                'review_reminder',
                jsonb_build_object('booking_id', NEW.id, 'ground_id', NEW.ground_id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Wallet Transactions (Refunds/Credits)
CREATE OR REPLACE FUNCTION public.on_wallet_transaction_notify()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.type IN ('refund', 'credit', 'promo', 'referral')) THEN
        INSERT INTO public.notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            CASE 
                WHEN NEW.type = 'refund' THEN 'Refund Received'
                WHEN NEW.type = 'promo' THEN 'Cashback/Promo Received'
                ELSE 'Wallet Credited'
            END,
            '₹' || NEW.amount || ' has been credited to your BYG Wallet. ' || COALESCE(NEW.description, ''),
            'wallet_update',
            jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'type', NEW.type)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_wallet_transaction_notify ON public.wallet_transactions;
CREATE TRIGGER tr_on_wallet_transaction_notify
    AFTER INSERT ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.on_wallet_transaction_notify();

-- Trigger for status updates
DROP TRIGGER IF EXISTS tr_on_booking_status_change ON public.bookings;
CREATE TRIGGER tr_on_booking_status_change
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.on_booking_status_change_notify();

-- Trigger for new bookings
DROP TRIGGER IF EXISTS tr_on_booking_created_notify ON public.bookings;
CREATE TRIGGER tr_on_booking_created_notify
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.on_booking_status_change_notify();
-- Backfill existing notifications to include order number
DO $$
DECLARE
    r RECORD;
    v_booking_id UUID;
    v_id_short TEXT;
BEGIN
    FOR r IN SELECT id, message, data FROM public.notifications WHERE type = 'booking_update' AND message NOT LIKE '%#%' LOOP
        -- Try to get booking_id from data jsonb
        v_booking_id := (r.data->>'booking_id')::UUID;
        
        IF v_booking_id IS NOT NULL THEN
            v_id_short := UPPER(substring(v_booking_id::text, 1, 8));
            UPDATE public.notifications 
            SET message = REPLACE(message, 'Your booking ', 'Your booking #' || v_id_short || ' ')
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
