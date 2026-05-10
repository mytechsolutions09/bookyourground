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

// Constants moved to database platform_settings table

// --- AUTHORITATIVE Pricing Calculation Helper ---
// --- AUTHORITATIVE Pricing Calculation Helper ---
const calculateFinalAmounts = (details: any, groundType: string | null, settings: any, skipOwnerFee: boolean = false) => {
  const PLATFORM_FEE_RATE = Number(settings?.user_platform_fee_rate ?? 0.05);
  const GST_RATE = Number(settings?.gst_rate ?? 0.18);
  const CRICKET_FIXED_FEE = Number(settings?.cricket_owner_fee_fixed ?? 100);

  const isCash = details.payment_method === 'cash' || details.paymentMethod === 'cash';

  console.log(`[Pricing] Input details: ${JSON.stringify(details)}, settings: ${JSON.stringify(settings)}, isCash: ${isCash}`);
  
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
  
  // New breakdown logic
  const groundPrice = net;
  const platformFeeUser = Math.round(groundPrice * PLATFORM_FEE_RATE * 100) / 100;
  const gstUser = Math.round(platformFeeUser * GST_RATE * 100) / 100;
  const totalCharged = Math.round(groundPrice + platformFeeUser + gstUser); // Round to nearest zero decimals
  
  // Fee Logic:
  // - "Cricket Ground" (Full Ground) OR Cash Payment = Fixed Fee (CRICKET_FIXED_FEE per team)
  // - "Box Cricket" & Others = Percentage Fee (PLATFORM_FEE_RATE)
  const isFullCricket = String(groundType ?? '').toLowerCase() === 'cricket ground';
  let platformFeeOwner = 0;
  
  if (skipOwnerFee) {
    platformFeeOwner = 0;
    console.log(`[Pricing] Owner platform fee skipped (charge_platform_fee: false)`);
  } else if (isFullCricket || isCash) {
    const teamType = details.team_type ?? details.teamType ?? 'both';
    const teamCount = teamType === 'one' ? 1 : 2;
    platformFeeOwner = CRICKET_FIXED_FEE * teamCount;
    console.log(`[Pricing] ${isCash ? 'Cash Payment' : 'Full Cricket'} detected, using fixed owner fee: ${platformFeeOwner} (${teamCount} teams)`);
  } else {
    platformFeeOwner = Math.round(groundPrice * PLATFORM_FEE_RATE * 100) / 100;
    console.log(`[Pricing] ${groundType || 'Standard'} ground detected, using percentage fee: ${platformFeeOwner}`);
  }

  const gstOwner = Math.round(platformFeeOwner * GST_RATE * 100) / 100;
  const ownerSettlement = Math.round((groundPrice - platformFeeOwner - gstOwner) * 100) / 100;
  
  const bygNetRevenue = Math.round((platformFeeUser + platformFeeOwner) * 100) / 100;

  console.log(`[Pricing] Result -> Unit: ${priceUnit}, Gross: ${grossAmount}, Net: ${net}, TotalCharged: ${totalCharged}, OwnerSettlement: ${ownerSettlement}`);
  
  return {
    pricePerHour: priceUnit,
    totalAmount: grossAmount,
    discountAmount: discount,
    netAmount: net,
    groundPrice,
    platformFeeUser,
    gstUser,
    totalCharged,
    platformFeeOwner,
    gstOwner,
    ownerSettlement,
    bygNetRevenue
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

    // Fetch platform settings once
    const { data: settingsData } = await supabaseClient.from('platform_settings').select('key, value');
    const settings: any = {};
    settingsData?.forEach((s: any) => {
      settings[s.key] = s.value;
    });

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


    if (action === 'confirm-wallet-shop') {
      const { orderDetails, cartItems } = body;
      const userId = user.id;

      console.log(`[ShopWallet] Processing shop order for user: ${userId}, items: ${cartItems?.length}`);

      // Fetch user's wallet balance
      const { data: wallet, error: walletError } = await supabaseClient
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (walletError || !wallet) {
        throw new Error('Wallet not found for user');
      }

      const totalAmount = Number(orderDetails.total_amount);
      if (wallet.balance < totalAmount) {
        throw new Error(`Insufficient wallet balance. Available: ₹${wallet.balance}, Required: ₹${totalAmount}`);
      }

      // 1. Create Order
      const { data: order, error: orderError } = await supabaseClient
        .from('shop_orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          status: 'processing',
          payment_status: 'paid',
          payment_method: 'wallet',
          shipping_address: orderDetails.shipping_address,
          billing_address: orderDetails.billing_address,
          customer_name: orderDetails.customer_name,
          customer_phone: orderDetails.customer_phone
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const itemsToInsert = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_purchase: item.product.price,
        selected_attributes: item.selected_attributes
      }));

      const { error: itemsError } = await supabaseClient
        .from('shop_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Deduct from Wallet
      const { data: walletResult, error: processError } = await supabaseClient.rpc('process_wallet_transaction', {
        p_user_id: userId,
        p_amount: -totalAmount, 
        p_type: 'used',
        p_description: `Shop Order #${order.id.substring(0, 8).toUpperCase()}`,
        p_booking_id: null 
      });

      if (processError) throw processError;

      // 4. Clear Cart
      await supabaseClient.from('shop_cart').delete().eq('user_id', userId);

      return new Response(JSON.stringify({ 
        success: true, 
        orderId: order.id,
        message: 'Shop order placed successfully via wallet.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create-razorpay-shop-order') {
      const { orderDetails } = body;
      const amount = orderDetails.remaining_amount;
      
      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

      if (!keyId || !keySecret) {
        throw new Error('Razorpay keys not configured.');
      }

      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: `shop_${Date.now()}`
        }),
      });

      const order = await response.json();
      if (!response.ok) throw new Error(order.error?.description || 'Razorpay order failed');

      return new Response(JSON.stringify({ success: true, razorpayOrder: { ...order, key_id: keyId } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify-razorpay-shop-payment') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails, cartItems } = body;
      
      // 1. Verify Signature
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      const text = razorpay_order_id + "|" + razorpay_payment_id;
      const encoder = new TextEncoder();
      const secretData = encoder.encode(keySecret);
      const data = encoder.encode(text);
      
      const key = await crypto.subtle.importKey('raw', secretData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
      const generatedSignature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (generatedSignature !== razorpay_signature) throw new Error('Invalid signature');

      // 2. Create Order
      const { data: order, error: orderError } = await supabaseClient
        .from('shop_orders')
        .insert({
          user_id: user.id,
          total_amount: orderDetails.total_amount,
          status: 'processing',
          payment_status: 'paid',
          payment_method: orderDetails.wallet_amount > 0 ? `split_wallet_${orderDetails.payment_method}` : orderDetails.payment_method,
          shipping_address: orderDetails.shipping_address,
          billing_address: orderDetails.billing_address,
          customer_name: orderDetails.customer_name,
          customer_phone: orderDetails.customer_phone
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Create Items
      const itemsToInsert = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_purchase: item.product.price,
        selected_attributes: item.selected_attributes
      }));
      await supabaseClient.from('shop_order_items').insert(itemsToInsert);

      // 4. Handle Wallet Deduction if split
      if (orderDetails.wallet_amount > 0) {
        await supabaseClient.rpc('process_wallet_transaction', {
          p_user_id: user.id,
          p_amount: -orderDetails.wallet_amount,
          p_type: 'used',
          p_description: `Split Payment for Shop Order #${order.id.substring(0, 8).toUpperCase()}`,
          p_booking_id: null
        });
      }

      // 5. Clear Cart
      await supabaseClient.from('shop_cart').delete().eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true, orderId: order.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

        const { data: ground } = await supabaseClient.from('grounds').select('pitch_type, owner:profiles!owner_id(charge_platform_fee)').eq('id', ground_id).single();
        
        const { 
          pricePerHour, 
          discountAmount, 
          netAmount,
          groundPrice,
          platformFeeUser,
          gstUser,
          totalCharged,
          platformFeeOwner,
          gstOwner,
          ownerSettlement,
          bygNetRevenue
        } = calculateFinalAmounts(bookingDetails, ground?.pitch_type, settings, ground?.owner?.charge_platform_fee === false);

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
            ground_price: groundPrice,
            platform_fee_user: platformFeeUser,
            platform_fee_owner: platformFeeOwner,
            gst_user: gstUser,
            gst_owner: gstOwner,
            total_charged: totalCharged,
            owner_settlement: ownerSettlement,
            byg_net_revenue: bygNetRevenue,
            coupon_id,
            discount_amount: discountAmount,
            notes: (team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ` (Paid via PayU: ${txnid})`,
            status: 'confirmed',
            payment_method: 'payu',
            payment_received: true,
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
        // Fetch breakdown to get owner_settlement
        const { data: bData } = await supabaseClient
          .from('bookings')
          .select('owner_settlement')
          .eq('id', finalBookingId)
          .single();

        await supabaseClient.rpc('add_money_to_wallet', {
          target_user_id: bookingData.ground.owner_id,
          amount_to_add: bData?.owner_settlement || bookingData.total_amount,
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

        const { data: ground, error: groundError } = await supabaseClient.from('grounds').select('pitch_type, owner:profiles!owner_id(charge_platform_fee)').eq('id', ground_id).single();
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

        const { 
          pricePerHour, 
          discountAmount, 
          netAmount,
          groundPrice,
          platformFeeUser,
          gstUser,
          totalCharged,
          platformFeeOwner,
          gstOwner,
          ownerSettlement,
          bygNetRevenue
        } = calculateFinalAmounts(bookingDetails, ground?.pitch_type, settings, ground?.owner?.charge_platform_fee === false);

        const slots = bookingDetails.slots;

        if (slots && Array.isArray(slots) && slots.length > 0) {
          console.log(`[Cash] Creating multiple bookings for slots: ${slots.join(', ')}`);
          const bookingsToInsert = slots.map((slotTime: string) => {
            const [hours, minutes] = slotTime.split(':').map(Number);
            const duration = bookingDetails.slotDuration || 20;
            const totalMinutes = hours * 60 + minutes + duration;
            const endHours = Math.floor(totalMinutes / 60) % 24;
            const endMinutes = totalMinutes % 60;
            const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
            
            return {
              user_id: user.id,
              ground_id,
              booking_date,
              start_time: slotTime,
              end_time: endTime,
              total_hours: duration / 60,
              price_per_hour: pricePerHour / slots.length,
              total_amount: netAmount / slots.length,
              ground_price: groundPrice / slots.length,
              platform_fee_user: platformFeeUser / slots.length,
              platform_fee_owner: platformFeeOwner / slots.length,
              gst_user: gstUser / slots.length,
              gst_owner: gstOwner / slots.length,
              total_charged: totalCharged / slots.length,
              owner_settlement: ownerSettlement / slots.length,
              byg_net_revenue: bygNetRevenue / slots.length,
              coupon_id,
              discount_amount: discountAmount / slots.length,
              booked_for_name: bookingDetails.booked_for_name || bookingDetails.bookedForName,
              notes: (team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ` (Slots: ${slots.join(', ')}) (Duration: ${duration}) (Player: ${bookingDetails.booked_for_name || bookingDetails.bookedForName || 'Manual Entry'})` + ' (Cash Payment confirmed by Owner)',
              status: 'confirmed',
              payment_method: 'cash',
            };
          });

          const { data: newBookings, error: insertError } = await supabaseClient
            .from('bookings')
            .insert(bookingsToInsert)
            .select('id');

          if (insertError) {
             console.error(`[Cash] Insert error: ${insertError.message}`);
             throw new Error(`Booking creation failed: ${insertError.message}`);
          }
          finalBookingId = newBookings[0].id;
          console.log(`[Cash] New bookings created, first ID: ${finalBookingId}`);
        } else {
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
              ground_price: groundPrice,
              platform_fee_user: platformFeeUser,
              platform_fee_owner: platformFeeOwner,
              gst_user: gstUser,
              gst_owner: gstOwner,
              total_charged: totalCharged,
              owner_settlement: ownerSettlement,
              byg_net_revenue: bygNetRevenue,
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
          console.log(`[Cash] New booking created: ${finalBookingId}`);
        }
      } else if (finalBookingId) {
        console.log(`[Cash] Updating existing booking: ${finalBookingId}`);
        // For existing bookings being confirmed via cash, we should also calculate fees
        const { data: bData, error: bFetchError } = await supabaseClient.from('bookings').select('*, ground:grounds(pitch_type, owner:profiles!owner_id(charge_platform_fee))').eq('id', finalBookingId).single();
        if (bFetchError) throw new Error(`Booking not found: ${bFetchError.message}`);

        const { 
          pricePerHour, 
          discountAmount, 
          netAmount,
          groundPrice,
          platformFeeUser,
          gstUser,
          totalCharged,
          platformFeeOwner,
          gstOwner,
          ownerSettlement,
          bygNetRevenue
        } = calculateFinalAmounts(bookingDetails || bData, bData.ground?.pitch_type, settings, bData.ground?.owner?.charge_platform_fee === false);

        const updatePayload: any = { 
          status: 'confirmed', 
          payment_method: 'cash',
          price_per_hour: pricePerHour,
          total_amount: netAmount,
          ground_price: groundPrice,
          platform_fee_user: platformFeeUser,
          platform_fee_owner: platformFeeOwner,
          gst_user: gstUser,
          gst_owner: gstOwner,
          total_charged: totalCharged,
          owner_settlement: ownerSettlement,
          byg_net_revenue: bygNetRevenue,
          notes: 'Cash Payment confirmed by Owner'
        };
        
        if (bookingDetails?.booked_for_name || bookingDetails?.bookedForName) {
           updatePayload.booked_for_name = bookingDetails.booked_for_name || bookingDetails.bookedForName;
           updatePayload.notes = `(Player: ${bookingDetails.booked_for_name || bookingDetails.bookedForName}) Cash Payment confirmed by Owner`;
        }
        
        const { error: updateError } = await supabaseClient.from('bookings').update(updatePayload).eq('id', finalBookingId);
        if (updateError) throw new Error(`Booking update failed: ${updateError.message}`);
      }

      // Record transaction
      console.log(`[Cash] Recording transaction for booking: ${finalBookingId}`);
      const { data: bookingData } = await supabaseClient.from('bookings').select('user_id, total_amount, notes, ground:grounds(name, owner_id)').eq('id', finalBookingId).single();

      let txAmount = bookingData?.total_amount || 0;
      if (bookingData?.notes) {
        const matchSlots = /\(Slots:\s*([^)]+)\)/.exec(bookingData.notes);
        if (matchSlots) {
          const slots = matchSlots[1].split(',');
          if (slots.length > 0) {
             txAmount = txAmount * slots.length;
          }
        }
      }

      await supabaseClient.from('transactions').insert({
        booking_id: finalBookingId,
        user_id: user.id,
        amount: txAmount,
        status: 'completed',
        payment_method: 'cash',
        transaction_reference: 'CASH_' + Date.now(),
      });

      // Credit Owner's Wallet (Internal tracking / Settlement)
      if (bookingData?.ground?.owner_id) {
        // For cash, owner already has the money. We don't credit wallet.
        console.log(`[Cash] Owner ${bookingData.ground.owner_id} collected cash directly for booking ${finalBookingId}`);
      }

      console.log('[Cash] Finished successfully');
      return new Response(JSON.stringify({ success: true, bookingId: finalBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create-razorpay-order') {
      const { amount, currency = 'INR', receipt, groundId, bookingDetails } = body;
      
      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

      if (!keyId || !keySecret) {
        throw new Error('Razorpay keys not configured in Supabase Secrets.');
      }

      // Fetch Ground & Owner details to get split account
      const finalGroundId = groundId || bookingDetails?.ground_id;
      let transfers = [];
      
      if (finalGroundId) {
        const { data: ground } = await supabaseClient
          .from('grounds')
          .select('owner_id, pitch_type, owner:profiles!owner_id(charge_platform_fee)')
          .eq('id', finalGroundId)
          .single();
          
        if (ground?.owner_id) {
          const { data: bankDetails } = await supabaseClient
            .from('owner_bank_details')
            .select('razorpay_account_id')
            .eq('owner_id', ground.owner_id)
            .single();
            
          if (bankDetails?.razorpay_account_id) {
            // Calculate breakdown to get owner_settlement
            // Use provided bookingDetails or fallback to amount
            const breakdown = calculateFinalAmounts(bookingDetails || { total_amount: amount }, ground.pitch_type, settings, ground?.owner?.charge_platform_fee === false);
            
            transfers = [{
              account: bankDetails.razorpay_account_id,
              amount: Math.round(breakdown.ownerSettlement * 100), // convert to paise
              currency: currency,
              on_hold: true
            }];
            
            console.log(`[Razorpay] Split transfer to ${bankDetails.razorpay_account_id}: ${breakdown.ownerSettlement}`);
          }
        }
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
          transfers
        }),
      });

      const order = await response.json();
      if (!response.ok) {
        console.error('[Razorpay] Order creation failed:', JSON.stringify(order));
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

      // Fetch Transfer ID from Razorpay
      let razorpayTransferId = null;
      try {
        const keyId = Deno.env.get('RAZORPAY_KEY_ID');
        const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
        const response = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}/transfers`, {
          headers: {
            'Authorization': 'Basic ' + btoa(`${keyId}:${keySecret}`),
          },
        });
        const transfersData = await response.json();
        if (transfersData.items && transfersData.items.length > 0) {
          razorpayTransferId = transfersData.items[0].id;
          console.log(`[Razorpay] Found transfer ID: ${razorpayTransferId}`);
        }
      } catch (err) {
        console.error('[Razorpay] Error fetching transfer ID:', err.message);
      }

      let finalBookingId = bookingId;

      if ((!finalBookingId || finalBookingId === 'pending') && bookingDetails) {
        const { ground_id, booking_date, start_time, end_time, team_type, coupon_id } = bookingDetails;
        const slots = bookingDetails.slots;
        
        // Availability check
        if (slots && Array.isArray(slots) && slots.length > 0) {
          for (const slot of slots) {
            const { data: availableIds, error: availError } = await supabaseClient.rpc('available_ground_ids_for_slot', {
                p_ground_ids: [ground_id],
                p_booking_date: booking_date,
                p_start_time: slot,
            });

            if (availError) throw new Error(`Availability check failed: ${availError.message}`);
            
            const isAvailable = Array.isArray(availableIds) && availableIds.some((r: any) => r.ground_id === ground_id);
            if (!isAvailable) throw new Error(`Slot ${slot} no longer available.`);
          }
        } else {
          const { data: availableIds, error: availError } = await supabaseClient.rpc('available_ground_ids_for_slot', {
              p_ground_ids: [ground_id],
              p_booking_date: booking_date,
              p_start_time: start_time,
          });

          if (availError) throw new Error(`Availability check failed: ${availError.message}`);
          
          const isAvailable = Array.isArray(availableIds) && availableIds.some((r: any) => r.ground_id === ground_id);
          if (!isAvailable) throw new Error('Slot no longer available.');
        }

        const { data: ground } = await supabaseClient.from('grounds').select('pitch_type, owner:profiles!owner_id(charge_platform_fee)').eq('id', ground_id).single();
        
        const { 
          pricePerHour, 
          discountAmount, 
          netAmount,
          groundPrice,
          platformFeeUser,
          gstUser,
          totalCharged,
          platformFeeOwner,
          gstOwner,
          ownerSettlement,
          bygNetRevenue
        } = calculateFinalAmounts(bookingDetails, ground?.pitch_type, settings, ground?.owner?.charge_platform_fee === false);

        if (slots && Array.isArray(slots) && slots.length > 0) {
          console.log(`[Razorpay] Creating multiple bookings for slots: ${slots.join(', ')}`);
          const bookingsToInsert = slots.map((slotTime: string) => ({
            user_id: user.id,
            ground_id,
            booking_date,
            start_time: slotTime,
            total_hours: 1,
            price_per_hour: pricePerHour / slots.length,
            total_amount: netAmount / slots.length,
            ground_price: groundPrice / slots.length,
            platform_fee_user: platformFeeUser / slots.length,
            platform_fee_owner: platformFeeOwner / slots.length,
            gst_user: gstUser / slots.length,
            gst_owner: gstOwner / slots.length,
            total_charged: totalCharged / slots.length,
            owner_settlement: ownerSettlement / slots.length,
            byg_net_revenue: bygNetRevenue / slots.length,
            razorpay_order_id,
            razorpay_transfer_id: razorpayTransferId,
            coupon_id,
            discount_amount: discountAmount / slots.length,
            notes: (team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ` (Slot: ${slotTime})` + ` (Paid via Razorpay: ${razorpay_payment_id})`,
            status: 'confirmed',
            payment_method: (bookingDetails.wallet_amount ?? 0) > 0 ? 'split_wallet_razorpay' : 'razorpay',
            payment_received: true,
          }));

          const { data: newBookings, error: insertError } = await supabaseClient
            .from('bookings')
            .insert(bookingsToInsert)
            .select('id');

          if (insertError) throw insertError;
          finalBookingId = newBookings[0].id;
        } else {
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
              ground_price: groundPrice,
              platform_fee_user: platformFeeUser,
              platform_fee_owner: platformFeeOwner,
              gst_user: gstUser,
              gst_owner: gstOwner,
              total_charged: totalCharged,
              owner_settlement: ownerSettlement,
              byg_net_revenue: bygNetRevenue,
              razorpay_order_id,
              razorpay_transfer_id: razorpayTransferId, // Store the transfer ID
              coupon_id,
              discount_amount: discountAmount,
              notes: (team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ` (Paid via Razorpay: ${razorpay_payment_id})`,
              status: 'confirmed',
              payment_method: (bookingDetails.wallet_amount ?? 0) > 0 ? 'split_wallet_razorpay' : 'razorpay',
              payment_received: true,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          finalBookingId = newBooking.id;
        }
      } else {
        // Update existing booking with transfer ID if not already set
        await supabaseClient.from('bookings').update({
          razorpay_transfer_id: razorpayTransferId,
          payment_received: true,
          status: 'confirmed'
        }).eq('id', finalBookingId);
      }

      // Deduct from Wallet if split payment
      if (bookingDetails && bookingDetails.wallet_amount > 0) {
        console.log(`[Razorpay] Deducting wallet amount: ${bookingDetails.wallet_amount} for split payment`);
        const { error: walletDeductErr } = await supabaseClient.rpc('process_wallet_transaction', {
          p_user_id: user.id,
          p_amount: -Number(bookingDetails.wallet_amount),
          p_type: 'used',
          p_description: `Split payment for Booking #${finalBookingId.substring(0, 8).toUpperCase()}`,
          p_booking_id: finalBookingId
        });
        if (walletDeductErr) {
          console.error('[Razorpay] Wallet deduction failed:', walletDeductErr.message);
        }
      }

      // Record transaction
      const { data: bookingData } = await supabaseClient.from('bookings').select('user_id, ground:grounds(name, owner_id)').eq('id', finalBookingId).single();

      await supabaseClient.from('transactions').insert({
        booking_id: finalBookingId,
        user_id: user.id,
        amount: netAmount,
        status: 'completed',
        payment_method: (bookingDetails.wallet_amount ?? 0) > 0 ? 'split_wallet_razorpay' : 'razorpay',
        transaction_reference: razorpay_payment_id,
      });

      // Credit Owner's Wallet (Internal tracking / Settlement)
      if (bookingData?.ground?.owner_id) {
        // Fetch breakdown to get owner_settlement
        const { data: bData } = await supabaseClient
          .from('bookings')
          .select('owner_settlement')
          .eq('id', finalBookingId)
          .single();

        const amountToAdd = (bookingDetails && bookingDetails.slots && Array.isArray(bookingDetails.slots))
          ? ownerSettlement
          : (bData?.owner_settlement || bookingData.total_amount);

        await supabaseClient.rpc('add_money_to_wallet', {
          target_user_id: bookingData.ground.owner_id,
          amount_to_add: amountToAdd,
          description_text: `Earning from booking for ${bookingData.ground.name} (Settled via Wallet/Razorpay)`,
          ref_type: 'booking_revenue',
          ref_id: finalBookingId
        });
      }

      return new Response(JSON.stringify({ success: true, bookingId: finalBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'confirm-wallet') {
      const { bookingId, bookingDetails } = body;
      const finalBookingId = bookingId === 'pending' ? null : bookingId;

      // 1. Fetch details for atomic creation if needed
      const details = bookingDetails || {};
      const ground_id = details.ground_id;
      const amountToDeduct = Number(details.total_amount ?? 0);

      if (amountToDeduct <= 0) throw new Error('Invalid payment amount.');

      // 2. Atomic Wallet Deduction
      const { data: walletRes, error: walletErr } = await supabaseClient.rpc('process_wallet_transaction', {
        p_user_id: user.id,
        p_amount: -amountToDeduct, // negative for 'used'
        p_type: 'used',
        p_description: `Payment for booking at ground ID: ${ground_id}`,
        p_booking_id: finalBookingId
      });

      if (walletErr || !walletRes?.success) {
        throw new Error(walletRes?.error || walletErr?.message || 'Wallet deduction failed.');
      }

      let actualBookingId = finalBookingId;

      // 3. Create/Update Booking
      if (!actualBookingId) {
        const { data: ground } = await supabaseClient.from('grounds').select('pitch_type, owner:profiles!owner_id(charge_platform_fee)').eq('id', ground_id).single();
        
        const breakdown = calculateFinalAmounts(details, ground?.pitch_type, settings, ground?.owner?.charge_platform_fee === false);

        const slots = details.slots;

        if (slots && Array.isArray(slots) && slots.length > 0) {
          console.log(`[Wallet] Creating multiple bookings for slots: ${slots.join(', ')}`);
          const bookingsToInsert = slots.map((slotTime: string) => ({
            user_id: user.id,
            ground_id: details.ground_id,
            booking_date: details.booking_date,
            start_time: slotTime,
            total_hours: 1,
            price_per_hour: breakdown.pricePerHour / slots.length,
            total_amount: breakdown.netAmount / slots.length,
            ground_price: breakdown.groundPrice / slots.length,
            platform_fee_user: breakdown.platformFeeUser / slots.length,
            platform_fee_owner: breakdown.platformFeeOwner / slots.length,
            gst_user: breakdown.gstUser / slots.length,
            gst_owner: breakdown.gstOwner / slots.length,
            total_charged: breakdown.totalCharged / slots.length,
            owner_settlement: breakdown.ownerSettlement / slots.length,
            byg_net_revenue: breakdown.bygNetRevenue / slots.length,
            coupon_id: details.coupon_id,
            discount_amount: breakdown.discountAmount / slots.length,
            status: 'confirmed',
            payment_method: 'wallet',
            payment_received: true,
            notes: (details.team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ` (Slot: ${slotTime}) (Paid via Wallet)`,
          }));

          const { data: newBookings, error: insertError } = await supabaseClient
            .from('bookings')
            .insert(bookingsToInsert)
            .select('id');

          if (insertError) throw insertError;
          actualBookingId = newBookings[0].id;
        } else {
          const { data: newBooking, error: insertError } = await supabaseClient
            .from('bookings')
            .insert({
              user_id: user.id,
              ground_id: details.ground_id,
              booking_date: details.booking_date,
              start_time: details.start_time,
              end_time: details.end_time,
              total_hours: Number(details.total_hours ?? 1),
              price_per_hour: breakdown.pricePerHour,
              total_amount: breakdown.netAmount,
              ground_price: breakdown.groundPrice,
              platform_fee_user: breakdown.platformFeeUser,
              platform_fee_owner: breakdown.platformFeeOwner,
              gst_user: breakdown.gstUser,
              gst_owner: breakdown.gstOwner,
              total_charged: breakdown.totalCharged,
              owner_settlement: breakdown.ownerSettlement,
              byg_net_revenue: breakdown.bygNetRevenue,
              coupon_id: details.coupon_id,
              discount_amount: breakdown.discountAmount,
              status: 'confirmed',
              payment_method: 'wallet',
              payment_received: true,
              notes: (details.team_type === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') + ' (Paid via Wallet)',
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          actualBookingId = newBooking.id;
        }
      } else {
        await supabaseClient.from('bookings').update({
          status: 'confirmed',
          payment_method: 'wallet',
          payment_received: true,
          notes: 'Paid via Wallet'
        }).eq('id', actualBookingId);
      }

      // Record transaction
      await supabaseClient.from('transactions').insert({
        booking_id: actualBookingId,
        user_id: user.id,
        amount: amountToDeduct,
        status: 'completed',
        payment_method: 'wallet',
        transaction_reference: 'WALLET_' + Date.now(),
      });

      return new Response(JSON.stringify({ success: true, bookingId: actualBookingId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'refund-to-wallet') {
      const { bookingId, cancellationReason } = body;
      if (!bookingId) throw new Error('Booking ID required for cancellation.');

      // 1. Fetch Booking and User Role
      const { data: booking, error: bError } = await supabaseClient
        .from('bookings')
        .select('*, ground:grounds(name, owner_id)')
        .eq('id', bookingId)
        .single();

      if (bError || !booking) throw new Error('Booking not found.');
      if (booking.status === 'cancelled') return new Response(JSON.stringify({ success: true, message: 'Booking already cancelled.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: userProfile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single();
      const isOwner = booking.ground?.owner_id === user.id;
      const isAdmin = userProfile?.role === 'super_admin';
      const isPlayer = booking.user_id === user.id;

      if (!isOwner && !isAdmin && !isPlayer) {
        throw new Error('Unauthorized: You cannot cancel this booking.');
      }

      // 2. Policy Enforcement for Players
      if (isPlayer && !isAdmin && !isOwner) {
        const bDate = new Date(booking.booking_date);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const bDay = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
        const diffDays = Math.ceil((bDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 7) {
          throw new Error('Bookings can only be cancelled at least 7 days before the slot. Please contact support for urgent requests.');
        }
      }

      // 3. Update Booking Status
      // The database trigger 'on_booking_cancelled' will handle:
      // - User Wallet Refund
      // - Owner Revenue Reversal
      // - Email Notifications
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({ 
          status: 'cancelled', 
          cancellation_reason: cancellationReason || `Cancelled by ${userProfile?.role || 'user'}`,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, message: 'Booking cancelled. Refund processed to wallet if applicable.' }), {
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
