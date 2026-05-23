const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrlMatch = envFile.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = envFile.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = supabaseUrlMatch[1].replace(/['"]/g, '');
const supabaseKey = supabaseKeyMatch[1].replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: bStats } = await supabase.from('player_match_batting_stats').select('*').limit(2);
  console.log("Batting stats:", bStats);
  const { data: lbData } = await supabase.from('leaderboard').select('*').limit(2);
  console.log("Leaderboard:", lbData);
}

test();
