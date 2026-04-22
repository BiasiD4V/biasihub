import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY antes de rodar.')
  console.error('   Exemplo: VITE_SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=eyJ... node scripts/check_columns.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  const { data, error } = await supabase.from('orcamentos').select().limit(1)
  if (data && data.length > 0) {
    console.log('Columns in orcamentos:', Object.keys(data[0]))
  } else {
    console.error('No data found or error:', error)
  }
}

check()
