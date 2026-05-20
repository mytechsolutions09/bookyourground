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

const supabase = createClient(url, key);

async function run() {
  console.log('Querying 10 most recent bookings...');
  const { data: bookings, error: err } = await supabase
    .from('bookings')
    .select(`
      *,
      ground:grounds(*)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (err) {
    console.error('Booking search error:', err);
    return;
  }

  console.log(`Found ${bookings.length} bookings.`);
  for (const b of bookings) {
    console.log('--- BOOKING ---');
    console.log(`ID: ${b.id}`);
    console.log(`Date: ${b.booking_date} | Time: ${b.start_time}`);
    console.log(`Ground: ${b.ground?.name}`);
    console.log(`Booking columns: total_amount=${b.total_amount}, team_type=${b.team_type}, status=${b.status}`);
    console.log(`Notes: ${b.notes}`);
  }
}

run();
