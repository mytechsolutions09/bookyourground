const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrlMatch = envFile.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = envFile.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = supabaseUrlMatch[1].replace(/['"]/g, '');
const supabaseKey = supabaseKeyMatch[1].replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking for tables...");
  const checkList = ['sitemap', 'sitemaps', 'sitemap_urls', 'custom_urls', 'settings'];
  for (const table of checkList) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table ${table} error:`, error.message);
      } else {
        console.log(`Table ${table} EXISTS! Data:`, data);
      }
    } catch (e) {
      console.log(`Table ${table} exception:`, e.message);
    }
  }
}

test();
