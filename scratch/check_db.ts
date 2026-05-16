import { supabase } from './lib/supabase';

async function checkPitchTypes() {
  const { data, error } = await supabase
    .from('grounds')
    .select('pitch_type')
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const types = [...new Set(data.map(g => g.pitch_type))];
  console.log('Pitch Types:', types);
}

checkPitchTypes();
