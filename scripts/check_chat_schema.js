const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

async function run() {
  // Check current columns
  const res = await fetch(SUPABASE_URL + '/rest/v1/chat_mensagens?select=*&limit=1', {
    headers: {
      'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
      'apikey': SERVICE_ROLE_KEY,
    },
  });
  const data = await res.json();
  if (data.length > 0) {
    console.log('Current columns:', Object.keys(data[0]).join(', '));
    console.log('Has reacoes:', 'reacoes' in data[0]);
    console.log('Has deletado:', 'deletado' in data[0]);
  } else {
    console.log('No messages found');
  }
}
run();
