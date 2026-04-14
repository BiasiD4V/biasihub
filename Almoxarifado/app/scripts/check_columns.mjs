import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vzaabtzcilyoknksvhrc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o'

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
