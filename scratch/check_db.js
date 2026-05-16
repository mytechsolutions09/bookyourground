const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwvarvvyhjkvtgijwfkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dmFydnZ5aGprdnRnaWp3ZmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzU1NzQsImV4cCI6MjA5MDM1MTU3NH0.86IqiMJHcFWva9a0RUDKh_YEBo6Ynygt_BIvIov9gK4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('grounds')
    .select('name, pitch_type, active, approved')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample Grounds:');
  data.forEach(g => {
    console.log(`- ${g.name}: pitch_type=${g.pitch_type}, active=${g.active}, approved=${g.approved}`);
  });
}

checkData();
