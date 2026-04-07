import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const resendApiKey = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record } = payload

    // 1. Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch User Email and Ground Name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name, id')
      .eq('id', record.user_id)
      .single()

    const { data: userAuth } = await supabase.auth.admin.getUserById(record.user_id)
    const userEmail = userAuth.user?.email

    const { data: ground } = await supabase
      .from('grounds')
      .select('name, address')
      .eq('id', record.ground_id)
      .single()

    if (!userEmail) throw new Error('User email not found')

    // 3. Send Email using Resend (Recommended over SMTP for Hostinger)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Book my ground <booking@bookyourground.com>',
        to: userEmail,
        subject: `Booking Confirmed: ${ground.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #02c259;">Booking Confirmed!</h2>
            <p>Hi ${userProfile.full_name},</p>
            <p>Your booking for <strong>${ground.name}</strong> has been successfully placed.</p>
            <hr />
            <p><strong>Date:</strong> ${record.booking_date}</p>
            <p><strong>Time:</strong> ${record.start_time} - ${record.end_time}</p>
            <p><strong>Venue:</strong> ${ground.address}</p>
            <p><strong>Total Amount:</strong> ₹${record.total_amount}</p>
            <hr />
            <p>See you at the ground!</p>
          </div>
        `,
      }),
    })

    const result = await res.json()
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
