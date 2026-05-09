const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('/Users/arppitmkanotra/Documents/site/bookyourground/.env', 'utf8');
const supabaseUrl = envFile.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = envFile.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data } = await supabase.from('shop_products').select('id, name, category_id');
  console.log(data);
}
test();
