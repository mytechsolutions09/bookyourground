import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, booked_for_name, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) console.error(error)
  else console.log(JSON.stringify(data, null, 2))
}

check()
