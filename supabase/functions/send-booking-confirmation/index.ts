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

    console.log(`Processing ${record.status} notification for booking: ${record.id}`);

    // 2. Fetch User Profile, Auth User, and Ground Details
    const [profileRes, userRes, groundRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', record.user_id).single(),
      supabase.auth.admin.getUserById(record.user_id),
      supabase.from('grounds').select('name, address, city, state, owner_id').eq('id', record.ground_id).single()
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

    // 2.5 Fetch Owner Details
    const [ownerUserRes, ownerProfileRes] = await Promise.all([
      supabase.auth.admin.getUserById(ground.owner_id),
      supabase.from('profiles').select('full_name').eq('id', ground.owner_id).single()
    ]);

    const ownerEmail = ownerUserRes.data?.user?.email;
    const ownerName = ownerProfileRes.data?.full_name || 'Ground Owner';

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ground.name} ${ground.address} ${ground.city}`)}`
    
    const isCancelled = record.status === 'cancelled';
    const isRefunded = record.payment_method !== 'cash' && isCancelled;

    // 3. Prepare Email Contents
    const playerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isCancelled ? 'Booking Cancelled' : 'Booking Confirmed'}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 32px 24px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
                    <img src="https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/assets/logo.png" alt="BookYourGround" style="width: 180px; height: auto; display: block; margin: 0 auto;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="background-color: ${isCancelled ? '#7f1d1d' : '#043529'}; padding: 40px 24px;">
                    <div style="display: inline-block; background-color: ${isCancelled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(2, 194, 89, 0.1)'}; border: 1px solid ${isCancelled ? '#ef4444' : '#02c259'}; border-radius: 99px; padding: 6px 16px;">
                      <p style="color: ${isCancelled ? '#ef4444' : '#02c259'}; margin: 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${isCancelled ? 'Booking Cancelled' : 'Booking Confirmed'}</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Hi ${userFullName},</h2>
                    <p style="color: #4b5563; margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">
                      ${isCancelled 
                        ? `We're sorry to inform you that your booking at <span style="color: #7f1d1d; font-weight: 700;">${ground.name}</span> has been cancelled.`
                        : `Great news! Your booking at <span style="color: #043529; font-weight: 700;">${ground.name}</span> has been successfully confirmed. Get your gear ready and we'll see you on the field!`
                      }
                    </p>

                    ${isCancelled ? `
                    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                      <p style="color: #991b1b; margin: 0 0 8px 0; font-size: 14px; font-weight: 700; text-transform: uppercase;">Cancellation Reason</p>
                      <p style="color: #b91c1c; margin: 0 0 16px 0; font-size: 15px;">${record.cancellation_reason || 'No reason provided'}</p>
                      
                      ${isRefunded ? `
                      <div style="border-top: 1px solid #fee2e2; padding-top: 12px; margin-top: 12px;">
                        <p style="color: #991b1b; margin: 0; font-size: 14px; font-weight: 600;">
                          Refund Initiated: A full refund of ₹${record.total_charged} has been credited to your Book Your Ground Wallet. You can use this for your next booking!
                        </p>
                      </div>
                      ` : ''}
                    </div>
                    ` : ''}
                    
                    <!-- Booking Summary Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; margin-bottom: 40px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 24px;">
                            <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Date</p>
                            <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${record.booking_date.substring(0, 10)}</p>
                          </td>
                          <td style="padding-bottom: 24px;">
                            <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Time</p>
                            <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${record.start_time.split(':').slice(0, 2).join(':')} - ${record.end_time.split(':').slice(0, 2).join(':')}</p>
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

                    ${!isCancelled ? `
                    <!-- CTA Button -->
                    <div align="center" style="margin-bottom: 40px;">
                      <a href="${mapUrl}" style="background-color: #02c259; color: #ffffff; padding: 18px 40px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 194, 89, 0.3);">Get Directions</a>
                    </div>
                    ` : `
                    <div align="center" style="margin-bottom: 40px;">
                      <a href="https://bookyourground.com/search" style="background-color: #111827; color: #ffffff; padding: 18px 40px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block;">Find Another Ground</a>
                    </div>
                    `}

                    <!-- Total & Support -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 32px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td>
                            <p style="color: #111827; margin: 0; font-size: 15px; font-weight: 700;">
                              ${isCancelled ? 'Refund Amount' : 'Total Paid'}: ₹${record.total_charged || record.total_amount}
                            </p>
                          </td>
                        </tr>
                      </table>
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
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const ownerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isCancelled ? 'Booking Cancelled' : 'New Booking Notification'}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 32px 24px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
                    <img src="https://nwvarvvyhjkvtgijwfkc.supabase.co/storage/v1/object/public/assets/logo.png" alt="BookYourGround" style="width: 180px; height: auto; display: block; margin: 0 auto;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="background-color: ${isCancelled ? '#7f1d1d' : '#043529'}; padding: 40px 24px;">
                    <div style="display: inline-block; background-color: ${isCancelled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(2, 194, 89, 0.1)'}; border: 1px solid ${isCancelled ? '#ef4444' : '#02c259'}; border-radius: 99px; padding: 6px 16px;">
                      <p style="color: ${isCancelled ? '#ef4444' : '#02c259'}; margin: 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${isCancelled ? 'Booking Cancelled' : 'New Booking Alert'}</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Hi ${ownerName},</h2>
                    <p style="color: #4b5563; margin: 0 0 32px 0; font-size: 16px; line-height: 1.6;">
                      ${isCancelled 
                        ? `The booking for <span style="color: #7f1d1d; font-weight: 700;">${ground.name}</span> by ${userFullName} has been cancelled.<br><br><strong>Reason:</strong> ${record.cancellation_reason || 'Not specified'}`
                        : `You have received a new booking for <span style="color: #043529; font-weight: 700;">${ground.name}</span>. Here are the details of the session:`
                      }
                    </p>
                    
                    <!-- Booking Summary Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; margin-bottom: 40px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 24px;">
                            <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Player</p>
                            <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${userFullName}</p>
                          </td>
                          <td style="padding-bottom: 24px;">
                            <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">${isCancelled ? 'Status' : 'Payment'}</p>
                            <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${isCancelled ? 'CANCELLED' : `₹${record.total_charged || record.total_amount} (${record.payment_method || 'Confirmed'})`}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 24px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Date</p>
                            <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${record.booking_date.substring(0, 10)}</p>
                          </td>
                          <td style="padding-top: 24px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748b; margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Time</p>
                            <p style="color: #111827; margin: 0; font-size: 17px; font-weight: 700;">${record.start_time.split(':').slice(0, 2).join(':')} - ${record.end_time.split(':').slice(0, 2).join(':')}</p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- CTA Button -->
                    <div align="center" style="margin-bottom: 40px;">
                      <a href="https://bookyourground.com/owner/dashboard" style="background-color: ${isCancelled ? '#7f1d1d' : '#043529'}; color: #ffffff; padding: 18px 40px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block;">Manage Bookings</a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 0 40px 48px 40px;">
                    <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
                      <p style="color: #94a3b8; margin: 0; font-size: 12px; line-height: 18px;">
                        &copy; 2026 Book Your Ground. All rights reserved.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 4. Send Emails in Parallel
    const emailPromises = [
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'Book Your Ground <booking@bookyourground.com>',
          to: userEmail,
          subject: isCancelled 
            ? `Cancelled: Your booking at ${ground.name}`
            : `Confirmed: Your session at ${ground.name}`,
          html: playerHtml,
        }),
      })
    ];

    if (ownerEmail) {
      console.log(`Notifying owner: ${ownerEmail}`);
      emailPromises.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Book Your Ground <booking@bookyourground.com>',
            to: ownerEmail,
            subject: isCancelled
              ? `Booking Cancelled: ${userFullName} at ${ground.name}`
              : `New Booking Alert: ${userFullName} at ${ground.name}`,
            html: ownerHtml,
          }),
        })
      );
    }

    const emailResponses = await Promise.all(emailPromises);
    const results = await Promise.all(emailResponses.map(r => r.json()));
    
    console.log('Resend API Responses:', JSON.stringify(results, null, 2))
    
    return new Response(JSON.stringify({ success: true, results }), { headers: { 'Content-Type': 'application/json' } })



  } catch (error) {
    console.error('Fatal Error in send-booking-confirmation:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
