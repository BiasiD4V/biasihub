const fs = require('fs');
const base = 'C:\\Users\\Ryan\\Downloads\\PLATAFORMA - BIASIHUB';

const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjQyNDYsImV4cCI6MjA5MDEwMDI0Nn0.L0nCAztRmHFTaJAoT22P_Y5eHUNG9-HStY3it1nSq1U';

async function insert(table, rows) {
  const BATCH = 50;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(batch)
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`ERRO batch ${i}: ${err}`);
    } else {
      total += batch.length;
      if (total % 200 === 0 || i + BATCH >= rows.length) process.stdout.write(`\r  ${total}/${rows.length}`);
    }
  }
  console.log('');
}

async function main() {
  // CLIENTES
  const clientes = JSON.parse(fs.readFileSync(base + '\\clientes_parsed.json', 'utf8'));
  const clientesRows = clientes.map(c => ({
    nome: c.nome || null,
    fantasia: c.fantasia || null,
    cnpj_cpf: c.cnpj_cpf || null,
    tipo_pessoa: c.tipo_pessoa || null,
    tipo_cliente: c.tipo_cliente || null,
    tipo: (c.tipo_cliente || '').toLowerCase().includes('privado') ? 'privado' :
          (c.tipo_cliente || '').toLowerCase().includes('publico') ? 'publico' : 'outro',
    cidade: c.municipio || null,
    estado: c.uf || null,
    endereco: c.endereco || null,
    bairro: c.bairro || null,
    cep: c.cep || null,
    ie: c.ie || null,
    telefone: c.telefone || null,
    email: c.email || null,
    site: c.site || null,
    codigo_erp: c.codigo || null,
    ativo: true
  }));

  // Verificar se já existem clientes antes de inserir
  const checkC = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=count`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact' }
  });
  const existC = checkC.headers.get('content-range');
  if (existC && !existC.endsWith('/0') && !existC.includes('*/0')) {
    console.log(`Clientes já existem (${existC}), pulando inserção.`);
  } else {
    console.log(`Inserindo ${clientesRows.length} clientes...`);
    await insert('clientes', clientesRows);
    console.log(`✓ Clientes inseridos!`);
  }

  // FORNECEDORES
  const fornecedores = JSON.parse(fs.readFileSync(base + '\\fornecedores_parsed.json', 'utf8'));
  const forneRows = fornecedores.map(f => ({
    codigo_erp: f.codigo || null,
    nome: f.nome,
    cnpj: f.cnpj || null,
    ie: f.ie ? f.ie.toString() : null,
    endereco: f.endereco || null,
    municipio: f.municipio || null,
    uf: f.uf || null,
    cep: f.cep || null,
    telefone: f.telefone || null,
    tipo: f.tipo || null,
    avaliacao: f.avaliacao || null,
    ativo: true
  }));

  // Verificar se já existem fornecedores antes de inserir
  const checkF = await fetch(`${SUPABASE_URL}/rest/v1/fornecedores?select=count`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact' }
  });
  const existF = checkF.headers.get('content-range');
  if (existF && !existF.endsWith('/0') && !existF.includes('*/0')) {
    console.log(`\nFornecedores já existem (${existF}), pulando inserção.`);
  } else {
    console.log(`\nInserindo ${forneRows.length} fornecedores...`);
    await insert('fornecedores', forneRows);
    console.log(`✓ Fornecedores inseridos!`);
  }

  // Verificação
  console.log('\n=== VERIFICAÇÃO ===');
  const rc = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=count`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact' }
  });
  console.log('Clientes total:', rc.headers.get('content-range'));

  const rf = await fetch(`${SUPABASE_URL}/rest/v1/fornecedores?select=count`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'count=exact' }
  });
  console.log('Fornecedores total:', rf.headers.get('content-range'));
}

main().catch(e => { console.error(e); process.exit(1); });
