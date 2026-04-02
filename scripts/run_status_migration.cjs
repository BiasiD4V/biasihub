const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://vzaabtzcilyoknksvhrc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMzNDgxOCwiZXhwIjoyMDYyOTEwODE4fQ.gMPMguMKjNoXUcjSRNPzWOGup1Mu_lXaby3DLHOQV0A'
);

async function run() {
  const sql = `ALTER TABLE mudancas_etapa ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aprovado';`;
  const { data, error } = await s.rpc('exec_sql', { sql });
  if (error) {
    console.log('RPC falhou, tentando via REST...');
    // Try direct insert to test the column
    const { data: d2, error: e2 } = await s.from('mudancas_etapa').select('status').limit(1);
    if (e2 && e2.message.includes('status')) {
      console.log('Coluna status não existe. Execute o SQL manualmente no Supabase Dashboard:');
      console.log(sql);
    } else {
      console.log('Coluna status já existe!', d2);
    }
  } else {
    console.log('Migração OK');
  }
}
run();
