const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

async function addColumns() {
  // Try inserting a dummy record with the new columns to see if they exist
  // If not, we'll create a separate table for reactions
  
  // Approach: Create a separate chat_reacoes table instead of altering
  const createTable = `
    CREATE TABLE IF NOT EXISTS chat_reacoes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      mensagem_id UUID NOT NULL,
      usuario_id UUID NOT NULL,
      usuario_nome TEXT NOT NULL,
      emoji TEXT NOT NULL,
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(mensagem_id, usuario_id, emoji)
    );
  `;
  
  // Try to use the query endpoint
  const endpoints = [
    '/rest/v1/rpc/exec_sql',
    '/rest/v1/rpc/execute_sql', 
    '/rest/v1/rpc/run_sql',
    '/rest/v1/rpc/sql'
  ];
  
  for (const ep of endpoints) {
    try {
      const res = await fetch(SUPABASE_URL + ep, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: createTable }),
      });
      if (res.ok) {
        console.log('Success via', ep);
        return;
      }
      const text = await res.text();
      console.log(ep, res.status, text.substring(0, 100));
    } catch(e) {
      console.log(ep, 'error:', e.message);
    }
  }
  
  console.log('\nNo SQL RPC available. Generating migration SQL file instead.');
  console.log('Please run this in Supabase SQL Editor:\n');
  console.log('ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS reacoes JSONB DEFAULT \'{}\'::jsonb;');
  console.log('ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false;');
}

addColumns();
