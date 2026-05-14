const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Try reading from .env file directly if env vars are not set in the current process
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    
    if (urlMatch && keyMatch) {
      const url = urlMatch[1].trim();
      const key = keyMatch[1].trim();
      queryDatabase(url, key);
    } else {
      console.error('Could not find Supabase credentials in .env');
    }
  } catch (e) {
    console.error('Failed to read .env file', e);
  }
} else {
  queryDatabase(supabaseUrl, supabaseAnonKey);
}

async function queryDatabase(url, key) {
  const supabase = createClient(url, key);
  
  const { data, error } = await supabase
    .from('shop_products')
    .select('*')
    .ilike('name', '%SG Shield 20 Cricket Balls%');
    
  if (error) {
    console.error('Error fetching product:', error);
  } else {
    console.log('Product Data:', JSON.stringify(data, null, 2));
  }
}
