const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSlots() {
  const { count, error } = await supabase
    .from('time_slots')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('Error fetching count:', error);
    return;
  }
  
  console.log('Total time slots in DB:', count);
  
  const { data: samples } = await supabase
    .from('time_slots')
    .select('ground_id, start_time, day_of_week')
    .limit(5);
    
  console.log('Sample slots:', samples);
}

checkSlots();
