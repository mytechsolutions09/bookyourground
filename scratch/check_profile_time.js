const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwvarvvyhjkvtgijwfkc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53dmFydnZ5aGprdnRnaWp3ZmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzU1NzQsImV4cCI6MjA5MDM1MTU3NH0.86IqiMJHcFWva9a0RUDKh_YEBo6Ynygt_BIvIov9gK4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfile() {
  console.log('Fetching first profile...');
  const start = Date.now();
  try {
    const { data: firstProfile, error: pError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (pError) {
      console.error('Fetch first profile error:', pError);
      return;
    }
    
    if (!firstProfile) {
      console.log('No profiles found in the table!');
      return;
    }
    
    console.log(`Found a profile ID: ${firstProfile.id} in ${Date.now() - start}ms`);
    
    // Now try to fetch this profile directly
    console.log('Fetching profile by ID...');
    const start2 = Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', firstProfile.id)
      .maybeSingle();
      
    if (error) {
      console.error('Fetch by ID error:', error);
    } else {
      console.log(`Fetched profile data successfully in ${Date.now() - start2}ms`);
      console.log('Profile data:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkProfile();
