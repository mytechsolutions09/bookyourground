const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwvarvvyhjkvtgijwfkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dmFydnZ5aGprdnRnaWp3ZmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzU1NzQsImV4cCI6MjA5MDM1MTU3NH0.86IqiMJHcFWva9a0RUDKh_YEBo6Ynygt_BIvIov9gK4';

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = 'a0eaa2b2-275a-4d79-b1f7-c9cdc9a0ef66';

async function testRace() {
  console.log('Testing Promise.race on supabase query...');
  const profilePromise = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
  );

  try {
    const start = Date.now();
    const { data, error } = await Promise.race([profilePromise, timeoutPromise]);
    console.log(`Resolved in ${Date.now() - start}ms`);
    console.log('Data:', !!data);
    console.log('Error:', error);
  } catch (err) {
    console.error('Catch block error:', err);
  }
}

testRace();
