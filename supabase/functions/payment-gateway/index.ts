import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0?bundle';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function timeToMinutes(time: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(time ?? '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function bookingHours(startTime: string | null | undefined, endTime: string | null | undefined): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start == null || end == null) return 1;
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  return Math.max(diff / 60, 1);
}

function isBoxCricket(pitchType: string | null | undefined): boolean {
  return String(pitchType ?? '').toLowerCase().includes('box');
}

// --- AUTHORITATIVE Pricing Calculation Helper ---
const calculateFinalAmounts = (details: any, groundType: string | null) => {
  console.log(`[Pricing] Input details: ${JSON.stringify(details)}`);
  
  let discount = Number(details.discount_amount ?? details.discountAmount ?? 0);
  const priceUnit = Number(details.price_per_hour ?? details.pricePerHour ?? 0);
  
  // CRITICAL: Prioritize client-provided total (check multiple possible keys)
  const clientTotal = Number(details.total_amount ?? details.totalAmount ?? details.amount ?? 0);

  let grossAmount = 0;
  if (clientTotal > 0) {
    console.log(`[Pricing] Using authoritative client-provided total: ${clientTotal}`);
    grossAmount = clientTotal + discount;
  } else {
    console.log(`[Pricing] WARNING: Client total missing, falling back to calculation logic`);
    const hours = Number(details.total_hours ?? details.totalHours ?? 1);
    const isBox = String(groundType ?? '').toLowerCase().includes('box');
    if (isBox) {
      grossAmount = priceUnit * hours;
    } else {
      grossAmount = (details.team_type === 'one' || details.teamType === 'one') ? (priceUnit / 2) : priceUnit;
    }
  }
  
  const net = Math.round((grossAmount - discount) * 100) / 100;
  console.log(`[Pricing] Result -> Unit: ${priceUnit}, Gross: ${grossAmount}, Net: ${net}`);
  
  return {
    pricePerHour: priceUnit,
    totalAmount: grossAmount,
    discountAmount: discount,
    netAmount: net
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing');
      throw new Error('Server Configuration Error: Supabase keys not found.');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Debug: Log headers (sanitized)
    const headers: any = {};
    req.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'authorization' || k.toLowerCase() === 'apikey') {
        headers[k] = v.substring(0, 15) + '...';
      } else {
        headers[k] = v;
      }
    });
    console.log('Request headers:', JSON.stringify(headers));

    // Get the user from the authorization header
    // Use lower-case as well just in case
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    
    if (!authHeader) {
      console.error('No Authorization header found in request');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized: Missing Authorization Header' 
      }), {
        status: 200, // Return 200 to see the error in client
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    if (!token || token === 'undefined' || token === 'null' || token === '') {
      console.error('Invalid token found in Authorization header');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized: Invalid Token' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth User Error:', userError?.message || 'No user found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Unauthorized: ${userError?.message || 'Invalid Session'}` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const body = await req.json().catch(() => ({}));
    const { action, bookingId, bookingDetails, paymentDetails } = body;

    console.log(`Action: ${action}, User: ${user.id}`);
    console.log('Request body:', JSON.stringify(body));


    if (action === 'create-payu-hash') {
      const { txnid, amount, firstname, email } = body;
      
      const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY') || '';
      const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT') || '';
      
      if (!merchantKey || !merchantSalt) {
        throw new Error('PayU keys not configured in Supabase Secrets.');
      }
      
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
      
      const merchantKey = Deno.env.get('PAYU_MERCHANT_KEY') || '';
      const merchantSalt = Deno.env.get('PAYU_MERCHANT_SALT') || '';

      if (!merchantKey || !merchantSalt) {
        throw new Error('PayU keys not configured in Supabase Secrets.');
      }

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
        
        // 1. Check availability FIRST
        const { data: availableIds, error: availError } = await supabaseClient.rpc('available_ground_ids_for_slot', {
            p_ground_ids: [ground_id],
            p_booking_date: booking_date,
            p_start_time: start_time,
        });

        if (availError) {
          console.error(`[PayU] Availability RPC error: ${availError.message}`);
          throw new Error(`Availability check failed: ${availError.message}`);
        }
        
        const isAvailable = Array.isArray(availableIds) && availableIds.some((r: any) => r.ground_id === ground_id);
        if (!isAvailable) {
            throw new Error('This slot is no longer available. Please contact support for a refund if payment was successful.');
        }

        const { data: ground } = await supabaseClient.from('grounds').select('pitch_type').eq('id', ground_id).single();
        
        const { pricePerHour, discountAmount, netAmount } = calculateFinalAmounts(bookingDetails, ground?.pitch_type);

        const { data: newBooking, error: insertError } = await supabaseClient
          .from('bookings')
          .insert({
            user_id: user.id,
            ground_id,
            booking_date,
            start_time,
            end_time,
            total_hours: Number(bookingDetails.total_hours ?? 1),
            price_per_hour: pricePerHour,
            total_amount: netAmount,
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
      const { data: bookingData } = await supabaseClient.from('bookings').select('total_amount, user_id, ground:grounds(name, owner_id)').eq('id', finalBookingId).single();

      await supabaseClient.from('transactions').insert({
        booking_id: finalBookingId,
        user_id: bookingData.user_id,
        amount: bookingData.total_amount,
        status: 'completed',
        payment_method: 'payu',
        transaction_reference: txnid,
      });

      // Credit Owner's Wallet
      if (bookingData?.ground?.owner_id) {
        await supabaseClient.rpc('add_money_to_wallet', {
          target_user_id: bookingData.ground.owner_id,
          amount_to_add: bookingData.total_amount,
          description_text: `Earning from booking for ${bookingData.ground.name}`,
          ref_type: 'booking_revenue',
          ref_id: finalBookingId
        });
      }

      return new Response(JSON.stringify({ success: true, bookingId: finalBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }



    if (action === 'confirm-cash') {
      console.log(`[Cash] Action started by user: ${user.id}`);
      
      let groundIdToVerify = bookingId ? null : bookingDetails?.ground_id;
      if (bookingId && bookingId !== 'pending') {
        console.log(`[Cash] Fetching ground ID for existing booking: ${bookingId}`);
        const { data: booking, error: bError } = await supabaseClient.from('bookings').select('ground_id').eq('id', bookingId).single();
        if (bError) {
          console.error(`[Cash] Booking fetch error: ${bError.message}`);
          throw new Error(`Booking not found: ${bError.message}`);
        }
        groundIdToVerify = booking?.ground_id;
      }

      if (!groundIdToVerify) {
        console.error('[Cash] No ground ID found to verify');
        throw new Error('Ground ID is required for cash confirmation.');
      }

      console.log(`[Cash] Verifying ownership for ground: ${groundIdToVerify}`);
      const { data: groundCheck, error: gCheckError } = await supabaseClient
        .from('grounds')
        .select('owner_id')
        .eq('id', groundIdToVerify)
        .single();
        
      if (gCheckError) {
        console.error(`[Cash] Ground check error: ${gCheckError.message}`);
        throw new Error(`Ground access error: ${gCheckError.message}`);
      }

      const { data: profile, error: pError } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single();
      if (pError) console.error(`[Cash] Profile fetch error: ${pError.message}`);

      const isOwner = groundCheck?.owner_id === user.id;
      const isSuperAdmin = profile?.role === 'super_admin';
      
      console.log(`[Cash] isOwner: ${isOwner}, isSuperAdmin: ${isSuperAdmin}, userRole: ${profile?.role}`);

      if (!isOwner && !isSuperAdmin) {
        console.error(`[Cash] Unauthorized: User ${user.id} tried to confirm cash for ground ${groundIdToVerify}`);
        throw new Error('Unauthorized: Only the ground owner or a super admin can confirm cash payments.');
      }

      let finalBookingId = bookingId === 'pending' ? null : bookingId;

      if (!finalBookingId && bookingDetails) {
        console.log('[Cash] Atomic create mode started');
        const { ground_id, booking_date, start_time, end_time, team_type, coupon_id } = bookingDetails;
        
        if (!ground_id || !booking_date || !start_time) {
          throw new Error('Missing mandatory booking details (ground_id, date, or time).');
        }

        const { data: ground, error: groundError } = await supabaseClient.from('grounds').select('pitch_type').eq('id', ground_id).single();
        if (groundError || !ground) throw new Error(`Ground not found: ${groundError?.message}`);

        console.log(`[Cash] Checking availability for ground ${ground_id} on ${booking_date} at ${start_time}`);
        const { data: availableIds, error: availError } = await supabaseClient.rpc('available_ground_ids_for_slot', {
            p_ground_ids: [ground_id],
            p_booking_date: booking_date,
            p_start_time: start_time,
        });

        if (availError) {
          console.error(`[Cash] Availability RPC error: ${availError.message}`);
          throw new Error(`Availability check failed: ${availError.message}`);
        }
        
        const isAvailable = Array.isArray(availableIds) && availableIds.some((r: any) => r.ground_id === ground_id);
        console.log(`[Cash] Is Available: ${isAvailable}`);

        if (!isAvailable) {
            throw new Error('This slot is no longer available.');
        }

        const { pricePerHour, discountAmount, netAmount } = calculateFinalAmounts(bookingDetails, ground?.pitch_type);

        const { data: newBooking, error: insertError } = await supabaseClient
          .from('bookings')
          .insert({
            user_id: user.id,
            ground_id,
            booking_date,
            start_time,
            end_time,
            total_hours: Number(bookingDetails.total_hours ?? 1),
            price_per_hour: pricePerHour,
            total_amount: netAmount,
            coupon_id,
            discount_amount: discountAmount,
            booked_for_name: bookingDetails.booked_for_name || bookingDetails.bookedForName,
            notes: (team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ` (Player: ${bookingDetails.booked_for_name || bookingDetails.bookedForName || 'Manual Entry'})` + ' (Cash Payment confirmed by Owner)',
            status: 'confirmed',
            payment_method: 'cash',
          })
          .select('id')
          .single();

        if (insertError) {
           console.error(`[Cash] Insert error: ${insertError.message}`);
           throw new Error(`Booking creation failed: ${insertError.message}`);
        }
        finalBookingId = newBooking.id;
      } else {
          console.log(`[Cash] Confirm existing mode for booking: ${bookingId}`);
          
          const updatePayload: any = { 
            status: 'confirmed', 
            payment_method: 'cash',
            notes: 'Cash Payment confirmed by Owner'
          };
          
          if (bookingDetails?.total_amount != null) {
             updatePayload.total_amount = Number(bookingDetails.total_amount);
          }
          
          if (bookingDetails?.booked_for_name || bookingDetails?.bookedForName) {
             updatePayload.booked_for_name = bookingDetails.booked_for_name || bookingDetails.bookedForName;
             updatePayload.notes = `(Player: ${bookingDetails.booked_for_name || bookingDetails.bookedForName}) Cash Payment confirmed by Owner`;
          }
          
          const { error: updateError } = await supabaseClient.from('bookings').update(updatePayload).eq('id', bookingId);
          if (updateError) throw new Error(`Booking update failed: ${updateError.message}`);
      }

      // Record transaction
      console.log(`[Cash] Recording transaction for booking: ${finalBookingId}`);
      const { data: bookingData } = await supabaseClient.from('bookings').select('total_amount, user_id, ground:grounds(name, owner_id)').eq('id', finalBookingId).single();

      await supabaseClient.from('transactions').insert({
        booking_id: finalBookingId,
        user_id: bookingData.user_id,
        amount: bookingData.total_amount,
        status: 'completed',
        payment_method: 'cash',
        transaction_reference: 'CASH_' + Date.now(),
      });

      // Credit Owner's Wallet
      if (bookingData?.ground?.owner_id) {
        await supabaseClient.rpc('add_money_to_wallet', {
          target_user_id: bookingData.ground.owner_id,
          amount_to_add: bookingData.total_amount,
          description_text: `Earning from booking for ${bookingData.ground.name} (Cash)`,
          ref_type: 'booking_revenue',
          ref_id: finalBookingId
        });
      }

      console.log('[Cash] Finished successfully');
      return new Response(JSON.stringify({ success: true, bookingId: finalBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create-razorpay-order') {
      const { amount, currency = 'INR', receipt } = body;
      
      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

      if (!keyId || !keySecret) {
        throw new Error('Razorpay keys not configured in Supabase Secrets.');
      }

      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // convert to paise
          currency,
          receipt,
        }),
      });

      const order = await response.json();
      if (!response.ok) {
        throw new Error(order.error?.description || 'Failed to create Razorpay order');
      }

      return new Response(JSON.stringify({ ...order, key_id: keyId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify-razorpay-payment') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingDetails, bookingId } = body;
      
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keySecret) throw new Error('Razorpay secret not configured.');

      const text = razorpay_order_id + "|" + razorpay_payment_id;
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const secretData = encoder.encode(keySecret);
      
      const key = await crypto.subtle.importKey(
        'raw',
        secretData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
      const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (generatedSignature !== razorpay_signature) {
        throw new Error('Invalid Razorpay signature.');
      }

      let finalBookingId = bookingId;

      if ((!finalBookingId || finalBookingId === 'pending') && bookingDetails) {
        const { ground_id, booking_date, start_time, end_time, team_type, coupon_id } = bookingDetails;
        
        const { data: availableIds, error: availError } = await supabaseClient.rpc('available_ground_ids_for_slot', {
            p_ground_ids: [ground_id],
            p_booking_date: booking_date,
            p_start_time: start_time,
        });

        if (availError) throw new Error(`Availability check failed: ${availError.message}`);
        
        const isAvailable = Array.isArray(availableIds) && availableIds.some((r: any) => r.ground_id === ground_id);
        if (!isAvailable) throw new Error('Slot no longer available.');

        const { data: ground } = await supabaseClient.from('grounds').select('pitch_type').eq('id', ground_id).single();
        
        const { pricePerHour, discountAmount, netAmount } = calculateFinalAmounts(bookingDetails, ground?.pitch_type);

        const { data: newBooking, error: insertError } = await supabaseClient
          .from('bookings')
          .insert({
            user_id: user.id,
            ground_id,
            booking_date,
            start_time,
            end_time,
            total_hours: Number(bookingDetails.total_hours ?? 1),
            price_per_hour: pricePerHour,
            total_amount: netAmount,
            coupon_id,
            discount_amount: discountAmount,
            notes: (team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ` (Paid via Razorpay: ${razorpay_payment_id})`,
            status: 'confirmed',
            payment_method: 'razorpay',
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        finalBookingId = newBooking.id;
      }

      // Record transaction
      const { data: bookingData } = await supabaseClient.from('bookings').select('total_amount, user_id, ground:grounds(name, owner_id)').eq('id', finalBookingId).single();

      await supabaseClient.from('transactions').insert({
        booking_id: finalBookingId,
        user_id: bookingData.user_id,
        amount: bookingData.total_amount,
        status: 'completed',
        payment_method: 'razorpay',
        transaction_reference: razorpay_payment_id,
      });

      // Credit Owner's Wallet
      if (bookingData?.ground?.owner_id) {
        await supabaseClient.rpc('add_money_to_wallet', {
          target_user_id: bookingData.ground.owner_id,
          amount_to_add: bookingData.total_amount,
          description_text: `Earning from booking for ${bookingData.ground.name}`,
          ref_type: 'booking_revenue',
          ref_id: finalBookingId
        });
      }

      return new Response(JSON.stringify({ success: true, bookingId: finalBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Edge Function Error:', err.message);
    // For debugging: Return 200 even on error so we can see the message on the client
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
