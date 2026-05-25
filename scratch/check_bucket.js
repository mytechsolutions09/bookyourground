import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
);

async function check() {
  const { data, error } = await supabase.storage.from('assets').list();
  if (error) {
    console.error('Error fetching bucket:', error);
  } else {
    console.log('Files in assets bucket:', data);
  }
}

check();
