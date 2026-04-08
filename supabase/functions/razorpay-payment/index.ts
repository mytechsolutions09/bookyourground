import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0?bundle';
import Razorpay from 'https://esm.sh/razorpay@2.9.2?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? '',
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') ?? '',
    });

    const body = await req.json();
    const { action, bookingId, bookingDetails, paymentDetails } = body;

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: Missing Authorization Header');
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new Error('Unauthorized: Invalid Token Format');
    }

    const authRes = await supabaseClient.auth.getUser(token);
    const user = authRes.data.user;
    const userError = authRes.error;
    
    if (userError || !user) {
      console.error('Auth User Error:', userError?.message || 'No user found');
      throw new Error(`Unauthorized: ${userError?.message || 'Invalid Session'}`);
    }

    // Validate PayU Secrets early
    if (action === 'create-payu-hash' || action === 'verify-payu-payment') {
      const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY');
      const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT');
      
      if (!merchantKey || !merchantSalt) {
        console.error('PAYU_MERCHANT_KEY or PAYU_MERCHANT_SALT is missing in Supabase Secrets.');
        throw new Error('Payment Gateway Configuration Error: Secrets not found in Edge Function.');
      }
    }

    if (action === 'create-order') {
      let amount: number;
      let groundName: string;

      if (bookingId) {
        // Mode A: Existing pending booking
        const { data: booking, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('*, grounds(name)')
          .eq('id', bookingId)
          .single();

        if (bookingError || !booking) throw new Error('Booking not found');
        amount = Math.round(booking.total_amount * 100);
        groundName = booking.grounds.name;
      } else if (bookingDetails) {
        // Mode B: New booking
        const { ground_id, booking_date, start_time, team_type, coupon_id } = bookingDetails;
        
        // 1. Fetch ground details
        const { data: ground, error: groundError } = await supabaseClient
          .from('grounds')
          .select('*')
          .eq('id', ground_id)
          .single();
        if (groundError || !ground) throw new Error('Ground not found');
        groundName = ground.name;

        // 2. Check availability
        const { data: availableIds, error: availError } = await supabaseClient.rpc('available_ground_ids_for_slot', {
            target_date: booking_date,
            target_time: start_time,
            target_type: ground.pitch_type,
        });

        if (availError) throw availError;
        if (!availableIds || !availableIds.includes(ground_id)) {
            throw new Error('This slot is no longer available. Please choose another time.');
        }

        // 3. Calculate amount (simplified logic - should ideally match DB functions)
        let price = ground.base_price_per_hour;
        if (ground.pitch_type.toLowerCase().includes('cricket') && !ground.pitch_type.toLowerCase().includes('box')) {
           if (team_type === 'one') price = Math.round((price / 2) * 100) / 100;
        }

        // Apply coupon if exists (mocking logic here - ideally call a function)
        let finalAmount = price;
        if (coupon_id) {
           const { data: coupon } = await supabaseClient.from('coupons').select('*').eq('id', coupon_id).single();
           if (coupon) {
              if (coupon.discount_type === 'percentage') {
                finalAmount = price * (1 - (coupon.discount_value / 100));
              } else {
                finalAmount = Math.max(0, price - coupon.discount_value);
              }
           }
        }
        
        amount = Math.round(finalAmount * 100);
      } else {
        throw new Error('Booking ID or Details required');
      }

      // 4. Create Razorpay order
      const options = {
        amount,
        currency: 'INR',
        receipt: bookingId ? `booking_${bookingId}` : `new_${Date.now()}`,
        notes: {
          booking_id: bookingId || 'new',
          booking_details: bookingDetails ? JSON.stringify(bookingDetails) : null,
          user_id: user.id,
        },
      };

      const order = await razorpay.orders.create(options);

      return new Response(JSON.stringify(order), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create-payu-hash') {
      const { txnid, amount, firstname, email } = body;
      const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY') ?? '';
      const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT') ?? '';
      
      const cleanTxnid = String(txnid || '').trim();
      const formattedAmount = Number(amount || 0).toFixed(2);
      const cleanProductInfo = 'Booking'; 
      const cleanFirstname = String(firstname || 'Guest').trim().split(' ')[0];
      const cleanEmail = String(email || '').trim();

      // Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|SALT
      const hashArray = [
        merchantKey,
        cleanTxnid,
        formattedAmount,
        cleanProductInfo,
        cleanFirstname,
        cleanEmail,
        '', // udf1
        '', // udf2
        '', // udf3
        '', // udf4
        '', // udf5
        '', // udf6
        '', // udf7
        '', // udf8
        '', // udf9
        '', // udf10
        merchantSalt
      ];

      const hashString = hashArray.join('|');
      const encoder = new TextEncoder();
      const data = encoder.encode(hashString);
      const hashBuffer = await crypto.subtle.digest('SHA-512', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return new Response(JSON.stringify({ 
        hash: hashHex,
        txnid: cleanTxnid,
        amount: formattedAmount,
        productinfo: cleanProductInfo,
        firstname: cleanFirstname,
        email: cleanEmail
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify-payu-payment') {
      const { status, txnid, amount, productinfo, firstname, email, hash } = paymentDetails;
      const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY') ?? '';
      const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT') ?? '';

      // Verify status first
      if (status !== 'success') {
         throw new Error('Payment failed or cancelled.');
      }

      // Reverse Hash Verification (optional but recommended)
      // sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
      // For now, if status is success and we trust the request (or better, verify with PayU API)
      
      let finalBookingId = bookingId;

      if (!finalBookingId && bookingDetails) {
        // ATOMIC CREATE (Same as Razorpay logic)
        const { ground_id, booking_date, start_time, end_time, team_type, coupon_id } = bookingDetails;
        const { data: ground } = await supabaseClient.from('grounds').select('pitch_type, base_price_per_hour').eq('id', ground_id).single();
        
        let pricePerHour = ground.base_price_per_hour;
        let totalAmount = pricePerHour;
        if (ground.pitch_type.toLowerCase().includes('cricket') && !ground.pitch_type.toLowerCase().includes('box')) {
           if (team_type === 'one') totalAmount = Math.round((pricePerHour / 2) * 100) / 100;
        }

        let discountAmount = 0;
        if (coupon_id) {
           const { data: coupon } = await supabaseClient.from('coupons').select('*').eq('id', coupon_id).single();
           if (coupon) {
              if (coupon.discount_type === 'percentage') {
                discountAmount = totalAmount * (coupon.discount_value / 100);
              } else {
                discountAmount = coupon.discount_value;
              }
           }
        }

        const { data: newBooking, error: insertError } = await supabaseClient
          .from('bookings')
          .insert({
            user_id: user.id,
            ground_id,
            booking_date,
            start_time,
            end_time,
            total_hours: 1,
            price_per_hour: pricePerHour,
            total_amount: Math.round((totalAmount - discountAmount) * 100) / 100,
            coupon_id,
            discount_amount: discountAmount,
            notes: (team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ` (Paid via PayU: ${txnid})`,
            status: 'confirmed',
            payment_method: 'payu',
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        finalBookingId = newBooking.id;
      }

      // Record transaction
      const { data: bookingData } = await supabaseClient.from('bookings').select('total_amount, user_id').eq('id', finalBookingId).single();

      await supabaseClient.from('transactions').insert({
        booking_id: finalBookingId,
        user_id: bookingData.user_id,
        amount: bookingData.total_amount,
        status: 'completed',
        payment_method: 'payu',
        transaction_reference: txnid,
      });

      return new Response(JSON.stringify({ success: true, bookingId: finalBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'confirm-cash') {
      // Security check: Only ground owners can confirm cash payments
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (profileError || !['ground_owner', 'super_admin'].includes(profile?.role || '')) {
        throw new Error('Only ground owners or super admins can confirm cash payments.');
      }

      let finalBookingId = bookingId;

      if (!finalBookingId && bookingDetails) {
        // ATOMIC CREATE (Cash Mode)
        const { ground_id, booking_date, start_time, end_time, team_type, coupon_id } = bookingDetails;
        
        const { data: ground } = await supabaseClient.from('grounds').select('pitch_type, base_price_per_hour').eq('id', ground_id).single();
        const { data: availableIds } = await supabaseClient.rpc('available_ground_ids_for_slot', {
            target_date: booking_date,
            target_time: start_time,
            target_type: ground?.pitch_type,
        });

        if (!availableIds || !availableIds.includes(ground_id)) {
            throw new Error('This slot is no longer available.');
        }

        let pricePerHour = ground.base_price_per_hour;
        let totalAmount = pricePerHour;
        if (ground.pitch_type.toLowerCase().includes('cricket') && !ground.pitch_type.toLowerCase().includes('box')) {
           if (team_type === 'one') totalAmount = Math.round((pricePerHour / 2) * 100) / 100;
        }

        let discountAmount = 0;
        if (coupon_id) {
           const { data: coupon } = await supabaseClient.from('coupons').select('*').eq('id', coupon_id).single();
           if (coupon) {
              if (coupon.discount_type === 'percentage') {
                discountAmount = totalAmount * (coupon.discount_value / 100);
              } else {
                discountAmount = coupon.discount_value;
              }
           }
        }

        const { data: newBooking, error: insertError } = await supabaseClient
          .from('bookings')
          .insert({
            user_id: user.id,
            ground_id,
            booking_date,
            start_time,
            end_time,
            total_hours: 1,
            price_per_hour: pricePerHour,
            total_amount: Math.round((totalAmount - discountAmount) * 100) / 100,
            coupon_id,
            discount_amount: discountAmount,
            notes: (team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ' (Cash Payment confirmed by Owner)',
            status: 'confirmed',
            payment_method: 'cash',
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        finalBookingId = newBooking.id;
      } else {
          // Confirm existing
          await supabaseClient.from('bookings').update({ 
            status: 'confirmed', 
            payment_method: 'cash',
            notes: 'Cash Payment confirmed by Owner'
          }).eq('id', bookingId);
      }

      // Record transaction
      const { data: bookingData } = await supabaseClient.from('bookings').select('total_amount, user_id').eq('id', finalBookingId).single();

      await supabaseClient.from('transactions').insert({
        booking_id: finalBookingId,
        user_id: bookingData.user_id,
        amount: bookingData.total_amount,
        status: 'completed',
        payment_method: 'cash',
        transaction_reference: 'CASH_' + Date.now(),
      });

      return new Response(JSON.stringify({ success: true, bookingId: finalBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify-payment') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentDetails;
      
      // In a real app: verify signature here
      // razorpay.utils.verifyPaymentSignature({...})

      let finalBookingId = bookingId;

      if (!finalBookingId && bookingDetails) {
        // ATOMIC CREATE
        // Ensure availability again just in case
        const { ground_id, booking_date, start_time, end_time, team_type, coupon_id } = bookingDetails;
        
        const { data: ground } = await supabaseClient.from('grounds').select('pitch_type, base_price_per_hour').eq('id', ground_id).single();
        const { data: availableIds } = await supabaseClient.rpc('available_ground_ids_for_slot', {
            target_date: booking_date,
            target_time: start_time,
            target_type: ground?.pitch_type,
        });

        if (!availableIds || !availableIds.includes(ground_id)) {
            // This is bad - payment was taken but slot is now gone. 
            // In a real app, logic for partial slot availability or REFUND here.
            throw new Error('Slot occupied during payment. Please contact support for a refund.');
        }

        // Calculate price one last time for insertion
        let pricePerHour = ground.base_price_per_hour;
        let totalAmount = pricePerHour;
        if (ground.pitch_type.toLowerCase().includes('cricket') && !ground.pitch_type.toLowerCase().includes('box')) {
           if (team_type === 'one') totalAmount = Math.round((pricePerHour / 2) * 100) / 100;
        }

        // Discount logic...
        let discountAmount = 0;
        if (coupon_id) {
           const { data: coupon } = await supabaseClient.from('coupons').select('*').eq('id', coupon_id).single();
           if (coupon) {
              if (coupon.discount_type === 'percentage') {
                discountAmount = totalAmount * (coupon.discount_value / 100);
              } else {
                discountAmount = coupon.discount_value;
              }
           }
        }

        const { data: newBooking, error: insertError } = await supabaseClient
          .from('bookings')
          .insert({
            user_id: user.id,
            ground_id,
            booking_date,
            start_time,
            end_time,
            total_hours: 1, // simplified
            price_per_hour: pricePerHour,
            total_amount: Math.round((totalAmount - discountAmount) * 100) / 100,
            coupon_id,
            discount_amount: discountAmount,
            notes: team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams',
            status: 'confirmed',
            razorpay_order_id,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        finalBookingId = newBooking.id;
      } else {
          // Confirm existing
          await supabaseClient.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
      }

      // Record transaction
      const { data: bookingData } = await supabaseClient.from('bookings').select('total_amount, user_id').eq('id', finalBookingId).single();

      await supabaseClient.from('transactions').insert({
        booking_id: finalBookingId,
        user_id: bookingData.user_id,
        amount: bookingData.total_amount,
        status: 'completed',
        payment_method: 'razorpay',
        transaction_reference: razorpay_payment_id,
      });

      return new Response(JSON.stringify({ success: true, bookingId: finalBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
