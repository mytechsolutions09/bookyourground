import { supabase } from '../lib/supabase';

async function checkTables() {
  console.log("Checking standard tables...");
  
  const tables = ['follows', 'profiles_follows', 'player_follows', 'profile_connections', 'followers'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`[FOUND] Table '${table}' exists.`);
      } else if (error.code === 'PGRST116' || error.message.includes('not found')) {
        // Not found
      } else {
        console.log(`[MAYBE] Table '${table}' returned error:`, error.message);
      }
    } catch (e) {
      // Ignore
    }
  }
}

checkTables();
