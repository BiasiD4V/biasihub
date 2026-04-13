const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkMembers() {
  const { data, error } = await supabase
    .from('membros')
    .select('nome, papel, departamento, ativo')
    .or("departamento.eq.Comercial,papel.eq.comercial");

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log('--- MEMBROS DO COMERCIAL ---');
  data.forEach(m => {
    console.log(`${m.nome} | Papel: ${m.papel} | Depto: ${m.departamento} | Ativo: ${m.ativo ? 'SIM' : 'NÃO'}`);
  });
}

checkMembers();
