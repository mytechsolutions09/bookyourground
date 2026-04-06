import { supabase } from './lib/supabase';

async function debugOwnerGrounds() {
  console.log('--- DEBUGGING OWNER GROUNDS ---');
  
  // 1. Get all owners named arpit kanotra
  const { data: owners, error: ownerError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .or('full_name.ilike.%arpit%,email.ilike.%arpit%');

  if (ownerError) {
    console.error('Owner Error:', ownerError);
    return;
  }
  
  console.log('Owners found:', owners);

  // 2. Get all grounds
  const { data: grounds, error: groundsError } = await supabase
    .from('grounds')
    .select('id, name, owner_id, approved, active');

  if (groundsError) {
    console.error('Grounds Error:', groundsError);
    return;
  }

  console.log('Grounds found:', grounds);

  // 3. Match them
  owners.forEach(o => {
    const matched = grounds.filter(g => g.owner_id === o.id);
    console.log(`Owner ${o.full_name} (${o.email}) [ID: ${o.id}] has ${matched.length} grounds.`);
    matched.forEach(m => console.log(`  - Ground: ${m.name} [ID: ${m.id}]`));
  });
}

debugOwnerGrounds();
