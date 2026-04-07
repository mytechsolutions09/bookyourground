import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const resendApiKey = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Incoming Payload:', JSON.stringify(payload, null, 2))
    
    const { record } = payload
    if (!record) {
      console.warn('No record found in payload. This happens during manual tests or incorrect trigger configuration.')
      return new Response(JSON.stringify({ error: 'No record provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // 1. Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Processing booking confirmation for user: ${record.user_id}, ground: ${record.ground_id}`);

    // 2. Fetch User Email and Ground Name
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, id')
      .eq('id', record.user_id)
      .single()

    if (profileError || !userProfile) {
      console.error('Profile not found:', profileError);
      throw new Error(`User profile not found for ID: ${record.user_id}`);
    }

    const { data, error: userError } = await supabase.auth.admin.getUserById(record.user_id)
    if (userError || !data?.user) {
      console.error('Auth user not found:', userError);
      throw new Error(`User auth not found for ID: ${record.user_id}`);
    }
    
    const userEmail = data.user.email
    if (!userEmail) {
      throw new Error(`User ${record.user_id} has no email address associated with their account.`);
    }

    const { data: ground } = await supabase
      .from('grounds')
      .select('name, address, city, state')
      .eq('id', record.ground_id)
      .single()

    if (!userEmail) throw new Error('User email not found')

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ground.name} ${ground.address} ${ground.city}`)}`

    // 3. Send Email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Book your ground <booking@bookyourground.com>',
        to: userEmail,
        subject: `Confirmed: Your session at ${ground.name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmed</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td align="center" style="background-color: #043529; padding: 40px 20px;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Book your ground</h1>
                        <p style="color: #02c259; margin: 8px 0 0 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Booking Confirmed</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">Hi ${userProfile.full_name},</h2>
                        <p style="color: #4b5563; margin: 0 0 32px 0; font-size: 16px; line-height: 24px;">
                          Get your gear ready! Your booking at <strong>${ground.name}</strong> has been successfully confirmed. We've notified the ground owner to prepare for your arrival.
                        </p>
                        
                        <!-- Booking Details Card -->
                        <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-bottom: 20px;">
                                <p style="color: #6b7280; margin: 0; font-size: 13px; text-transform: uppercase; font-weight: 600;">Date</p>
                                <p style="color: #111827; margin: 4px 0 0 0; font-size: 16px; font-weight: 600;">${record.booking_date}</p>
                              </td>
                              <td style="padding-bottom: 20px;">
                                <p style="color: #6b7280; margin: 0; font-size: 13px; text-transform: uppercase; font-weight: 600;">Time</p>
                                <p style="color: #111827; margin: 4px 0 0 0; font-size: 16px; font-weight: 600;">${record.start_time} - ${record.end_time}</p>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2">
                                <p style="color: #6b7280; margin: 0; font-size: 13px; text-transform: uppercase; font-weight: 600;">Venue</p>
                                <p style="color: #111827; margin: 4px 0 0 0; font-size: 16px; font-weight: 600;">${ground.name}</p>
                                <p style="color: #4b5563; margin: 2px 0 0 0; font-size: 14px;">${ground.address}, ${ground.city}, ${ground.state}</p>
                              </td>
                            </tr>
                          </table>
                        </div>

                        <!-- Action Button -->
                        <div align="center" style="margin-bottom: 32px;">
                          <a href="${mapUrl}" style="background-color: #02c259; color: #ffffff; padding: 16px 32px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Get Directions</a>
                        </div>

                        <div style="border-top: 1px solid #e5e7eb; padding-top: 32px;">
                          <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 20px;">
                            <strong>Total Amount Paid:</strong> ₹${record.total_amount}<br>
                            If you have any questions or need to cancel, please contact the ground owner directly or reach out to our support team.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 0 40px 40px 40px;">
                        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                          &copy; 2026 Book your ground. All rights reserved.<br>
                          WZ-15, 3rd Floor, Janak Puri, New Delhi - 110058.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    })

    const result = await res.json()
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
