const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

async function run() {
  const sql = `
    ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS reacoes JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false;
  `;
  
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  
  if (!res.ok) {
    console.log('RPC failed, trying direct SQL via pg...');
    // Try via SQL editor endpoint
    const res2 = await fetch(SUPABASE_URL + '/rest/v1/rpc/pgmigrate', {
      method: 'POST', 
      headers: {
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!res2.ok) {
      console.log('No RPC available. Using Management API...');
      // Use Supabase Management API to run query
      const res3 = await fetch('https://api.supabase.com/v1/projects/vzaabtzcilyoknksvhrc/database/query', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sbp_e0f43f9feeb8db7ab8682e6c52b808d2dc20d003',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      const data3 = await res3.json();
      console.log('Management API result:', JSON.stringify(data3, null, 2));
    }
  } else {
    const data = await res.json();
    console.log('Success:', data);
  }
}

run();
