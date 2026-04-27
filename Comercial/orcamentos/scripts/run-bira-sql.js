const https = require('https');

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

// Execute SQL against Supabase using the Management API
// We'll use the pg connection string approach through the Supabase SQL endpoint
const sql = [
  "CREATE TABLE IF NOT EXISTS bira_tarefas (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, codigo text NOT NULL, titulo text NOT NULL, descricao text, status text NOT NULL DEFAULT 'ideia', prioridade text NOT NULL DEFAULT 'Medium', tipo text NOT NULL DEFAULT 'tarefa', responsavel_id uuid, responsavel_nome text, criador_id uuid, criador_nome text, parent_id uuid, data_inicio date, data_limite date, etiquetas text[] DEFAULT ARRAY[]::text[], ordem int DEFAULT 0, criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())",
  "CREATE TABLE IF NOT EXISTS bira_comentarios (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, tarefa_id uuid NOT NULL REFERENCES bira_tarefas(id) ON DELETE CASCADE, autor_id uuid, autor_nome text NOT NULL, autor_avatar text, corpo text NOT NULL, criado_em timestamptz DEFAULT now())",
  "ALTER TABLE bira_tarefas ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE bira_comentarios ENABLE ROW LEVEL SECURITY",
].join('; ');

// Try using the Supabase REST API to check if tables exist first
function checkTable(table) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'vzaabtzcilyoknksvhrc.supabase.co',
      path: `/rest/v1/${table}?select=id&limit=0`,
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: d });
      });
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.end();
  });
}

async function main() {
  // Check if table already exists
  const result = await checkTable('bira_tarefas');
  console.log('Check bira_tarefas:', result.status, result.body.substring(0, 200));
  
  if (result.status === 200) {
    console.log('Table bira_tarefas already exists!');
  } else {
    console.log('Table does NOT exist. Need to create it via Supabase SQL Editor.');
    console.log('Status:', result.status);
  }
}

main();
