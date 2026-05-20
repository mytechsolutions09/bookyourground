const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let envUrl = '';
let envKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
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
  console.log('Fetching profiles...');
  const startTime = Date.now();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log(`Fetched ${data.length} profiles in ${Date.now() - startTime}ms`);
    data.forEach(p => {
      console.log(`ID: ${p.id} | Name: ${p.full_name} | Role: ${p.role} | Verified: ${p.business_verified}`);
    });
  }
}

run();
