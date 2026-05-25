const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testInsert() {
  const testId = '11111111-2222-3333-4444-555555555555';
  console.log('Testing insert for profile:', testId);
  try {
    // Attempt insert
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        full_name: 'Test AI Imported Player',
        role: 'user'
      })
      .select();

    if (error) {
      console.error('Insert failed:', error.message);
    } else {
      console.log('Insert Succeeded! Data:', data);
      // Clean up
      const { error: delError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', testId);
      console.log('Clean up status:', delError ? delError.message : 'Success');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testInsert();
