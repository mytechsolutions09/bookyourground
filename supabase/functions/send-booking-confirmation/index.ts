import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const resendApiKey = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    console.log('Incoming Payload:', JSON.stringify(payload, null, 2))
    
    const { record } = payload
    if (!record) {
      console.warn('No record found in payload.')
      return new Response(JSON.stringify({ error: 'No record provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is missing.')
      throw new Error('Email service not configured (Missing API Key)')
    }

    // 1. Initialize Supabase Client
    const supabase = createClient(
      supabaseUrl ?? '',
      supabaseServiceRoleKey ?? ''
    )

    console.log(`Processing booking confirmation for user: ${record.user_id}, ground: ${record.ground_id}`);

    // 2. Fetch User Profile, Auth User, and Ground Details
    const [profileRes, userRes, groundRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', record.user_id).single(),
      supabase.auth.admin.getUserById(record.user_id),
      supabase.from('grounds').select('name, address, city, state').eq('id', record.ground_id).single()
    ]);

    if (profileRes.error || !profileRes.data) {
      throw new Error(`User profile not found: ${profileRes.error?.message}`);
    }

    if (userRes.error || !userRes.data?.user) {
      throw new Error(`User auth not found: ${userRes.error?.message}`);
    }

    if (groundRes.error || !groundRes.data) {
      throw new Error(`Ground not found: ${groundRes.error?.message}`);
    }
    
    const userEmail = userRes.data.user.email
    const userFullName = profileRes.data.full_name || 'Valued Player'
    const ground = groundRes.data

    if (!userEmail) {
      throw new Error(`User has no email address associated with their account.`);
    }

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ground.name} ${ground.address} ${ground.city}`)}`

    // 3. Send Email using Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Book Your Ground <booking@bookyourground.com>',
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
                  <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td align="center" style="background-color: #043529; padding: 48px 24px;">
                        <img src="https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/assets/logo.png" alt="BookYourGround" style="width: 180px; height: auto; display: block; margin: 0 auto;">
                        <div style="margin-top: 24px; display: inline-block; background-color: rgba(2, 194, 89, 0.1); border: 1px solid #02c259; border-radius: 99px; padding: 6px 16px;">
                          <p style="color: #02c259; margin: 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Booking Confirmed</p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 48px 40px;">
                        <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Hi ${userFullName},</h2>
                        <p style="color: #4b5563; margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">
                          Great news! Your booking at <span style="color: #043529; font-weight: 700;">${ground.name}</span> has been successfully confirmed. Get your gear ready and we'll see you on the field!
                        </p>
                        
                        <!-- Booking Summary Card -->
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; margin-bottom: 40px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-bottom: 24px;">
                                <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Date</p>
                                <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${record.booking_date}</p>
                              </td>
                              <td style="padding-bottom: 24px;">
                                <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Time</p>
                                <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${record.start_time.substring(0, 5)} - ${record.end_time.substring(0, 5)}</p>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding-top: 24px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Venue</p>
                                <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${ground.name}</p>
                                <p style="color: #4b5563; margin: 4px 0 0 0; font-size: 14px; line-height: 20px;">${ground.address}, ${ground.city}, ${ground.state}</p>
                              </td>
                            </tr>
                          </table>
                        </div>

                        <!-- CTA Button -->
                        <div align="center" style="margin-bottom: 40px;">
                          <a href="${mapUrl}" style="background-color: #02c259; color: #ffffff; padding: 18px 40px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 194, 89, 0.3);">Get Directions</a>
                        </div>

                        <!-- Total & Support -->
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 32px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td>
                                <p style="color: #111827; margin: 0; font-size: 15px; font-weight: 700;">Total Paid: ₹${record.total_amount}</p>
                              </td>
                            </tr>
                          </table>
                          <p style="color: #94a3b8; margin: 24px 0 0 0; font-size: 13px; line-height: 20px; text-align: center;">
                            Need help? Contact the ground owner or reach out to our support team directly through the app.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 0 40px 48px 40px;">
                        <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                          <p style="color: #94a3b8; margin: 0; font-size: 12px; line-height: 18px;">
                            &copy; 2026 Book Your Ground. All rights reserved.<br>
                            WZ-15, 3rd Floor, Janak Puri, New Delhi - 110058.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #94a3b8; margin: 24px 0 0 0; font-size: 12px; text-align: center;">
                    You're receiving this because you made a booking on Book Your Ground.
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    })

    const result = await emailRes.json()
    console.log('Resend API Response:', JSON.stringify(result, null, 2))
    
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Fatal Error in send-booking-confirmation:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
