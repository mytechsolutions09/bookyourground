const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let envUrl = '';
let envKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
      envUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
      envKey = line.split('=')[1].trim();
    }
  }
} catch (e) {
  // Ignore
}

const url = envUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = envKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase at:', url);

const supabase = createClient(url, key);

async function run() {
  // First, find the booking with ID 48097787
  const { data: targetBooking, error: targetError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', '48097787-8494-4d2c-9a4f-56bb4f63c870') // wait, it might be a uuid or a simple prefix
    .ilike('id', '48097787%')
    .single();

  if (targetError || !targetBooking) {
    // If not found by prefix, let's just search all bookings for arpit kanotra
    console.log('Target booking not found, searching for all bookings...');
    const { data: allBookings, error: allErr } = await supabase
      .from('bookings')
      .select('*, user:profiles(full_name)')
      .limit(100);

    if (allErr) {
      console.error('Error fetching all bookings:', allErr);
      return;
    }

    console.log('Total bookings found:', allBookings.length);
    // Find arpit kanotra bookings
    const arpitBookings = allBookings.filter(b => b.notes && b.notes.toLowerCase().includes('arpit'));
    console.log('Arpit bookings:', arpitBookings.length);
    arpitBookings.forEach(b => {
      console.log(`ID: ${b.id} | Date: ${b.booking_date} | Time: ${b.start_time}-${b.end_time} | Status: ${b.status} | Notes: ${b.notes} | CreatedAt: ${b.created_at}`);
    });
    return;
  }

  console.log('Target Booking found:', targetBooking.id);
  console.log('Created At:', targetBooking.created_at);
  console.log('User ID:', targetBooking.user_id);
  console.log('Notes:', targetBooking.notes);

  // Find all bookings with similar created_at (same minute) or same user/ground
  const createdAtMinute = targetBooking.created_at.substring(0, 16);
  const { data: related, error: relError } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', targetBooking.user_id)
    .ilike('created_at', `${createdAtMinute}%`);

  if (relError) {
    console.error('Error fetching related:', relError);
    return;
  }

  console.log('Related bookings count:', related.length);
  related.forEach(b => {
    console.log(`ID: ${b.id} | Date: ${b.booking_date} | Time: ${b.start_time}-${b.end_time} | Amount: ${b.total_amount} | Status: ${b.status} | Notes: ${b.notes}`);
  });
}

run();
