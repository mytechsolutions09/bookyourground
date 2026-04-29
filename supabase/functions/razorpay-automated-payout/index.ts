import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0?bundle';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Calculate Target Date (T-2)
    // If today is Wednesday, we pay for matches on Monday.
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 2);
    const dateString = targetDate.toISOString().split('T')[0];

    console.log(`[Payout Automation] Processing payouts for date: ${dateString}`);

    // 2. Fetch all eligible bookings for that date
    // We only process 'confirmed' or 'completed' matches.
    // We only process those where payout_status is 'pending' and payout_enabled is true.
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        ground:grounds(owner_id)
      `)
      .eq('booking_date', dateString)
      .in('status', ['confirmed', 'completed'])
      .eq('payout_enabled', true)
      .eq('payout_status', 'pending');

    if (bookingsError) throw bookingsError;
    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ message: `No pending payouts found for ${dateString}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Payout Automation] Found ${bookings.length} matches to process.`);

    // 3. Group by Owner
    const ownersMap = new Map<string, any[]>();
    bookings.forEach(b => {
      const ownerId = b.ground?.owner_id;
      if (!ownerId) return;
      if (!ownersMap.has(ownerId)) ownersMap.set(ownerId, []);
      ownersMap.get(ownerId)!.push(b);
    });

    const results = [];

    // 4. Process each owner
    for (const [ownerId, ownerBookings] of ownersMap.entries()) {
      try {
        console.log(`[Payout Automation] Processing owner: ${ownerId}`);
        
        // Split into online and offline
        const onlineBookings = ownerBookings.filter(b => b.payment_method === 'razorpay' && b.razorpay_transfer_id);
        const offlineBookings = ownerBookings.filter(b => b.payment_method === 'cash');

        // Calculate Offline Debt (Fees for cash bookings)
        const totalOfflineFees = offlineBookings.reduce((sum, b) => {
          return sum + Number(b.platform_fee_owner || 0) + Number(b.gst_owner || 0);
        }, 0);

        console.log(`[Payout Automation] Owner ${ownerId}: Offline Debt = ${totalOfflineFees}, Online Transfers = ${onlineBookings.length}`);

        let remainingOfflineDebtPaise = Math.round(totalOfflineFees * 100);

        // Process Online Settlements
        for (const booking of onlineBookings) {
          const transferId = booking.razorpay_transfer_id;
          
          // Step A: If there is offline debt, reverse some amount from this transfer back to platform
          if (remainingOfflineDebtPaise > 0) {
            // We need to know the transfer amount to avoid reversing more than available
            // For now we assume ownerSettlement * 100 is the transfer amount
            const transferAmountPaise = Math.round(Number(booking.owner_settlement || 0) * 100);
            const reversalAmount = Math.min(transferAmountPaise, remainingOfflineDebtPaise);

            if (reversalAmount > 0) {
              console.log(`[Payout Automation] Reversing ${reversalAmount} paise from transfer ${transferId} to cover offline fees`);
              
              const revResponse = await fetch(`https://api.razorpay.com/v1/transfers/${transferId}/reversals`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
                },
                body: JSON.stringify({ amount: reversalAmount }),
              });

              if (!revResponse.ok) {
                const revError = await revResponse.json();
                console.error(`[Payout Automation] Reversal failed for ${transferId}:`, JSON.stringify(revError));
                // We don't throw here, just skip this reversal and try the next one or log error
              } else {
                remainingOfflineDebtPaise -= reversalAmount;
              }
            }
          }

          // Step B: Release the Hold
          console.log(`[Payout Automation] Releasing hold for transfer: ${transferId}`);
          const releaseResponse = await fetch(`https://api.razorpay.com/v1/transfers/${transferId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
            },
            body: JSON.stringify({ on_hold: false }),
          });

          if (!releaseResponse.ok) {
            const releaseError = await releaseResponse.json();
            console.error(`[Payout Automation] Release failed for ${transferId}:`, JSON.stringify(releaseError));
            
            await supabaseClient.from('bookings').update({
              payout_status: 'failed',
              payout_error: releaseError.error?.description || 'Failed to release hold',
              payout_processed_at: new Date().toISOString()
            }).eq('id', booking.id);
          } else {
            await supabaseClient.from('bookings').update({
              payout_status: 'completed',
              payout_processed_at: new Date().toISOString()
            }).eq('id', booking.id);
          }
        }

        // Mark offline bookings as processed too
        for (const booking of offlineBookings) {
          await supabaseClient.from('bookings').update({
            payout_status: 'completed',
            payout_processed_at: new Date().toISOString()
          }).eq('id', booking.id);
        }

        results.push({ ownerId, success: true });
      } catch (ownerErr) {
        console.error(`[Payout Automation] Error processing owner ${ownerId}:`, ownerErr.message);
        results.push({ ownerId, success: false, error: ownerErr.message });
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Payout processing completed', 
      date: dateString,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Automation Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
