const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, '');
  }
  return out;
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const env = { ...loadEnv(path.join(root, '.env')), ...loadEnv(path.join(root, '.env.local')), ...process.env };
  const password = env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = env.VITE_SUPABASE_URL || '';
  const ref = (supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1] || 'vzaabtzcilyoknksvhrc';
  if (!password) throw new Error('SUPABASE_DB_PASSWORD não encontrado no .env do Comercial.');

  const sqlPath = path.join(root, 'scripts', 'sql', '18-orcamento-workspace.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const hosts = [
    `aws-0-sa-east-1.pooler.supabase.com`,
    `db.${ref}.supabase.co`,
  ];
  const ports = [6543, 5432];
  let lastError;

  for (const host of hosts) {
    for (const port of ports) {
      const user = host.startsWith('db.') ? 'postgres' : `postgres.${ref}`;
      const client = new Client({ host, port, database: 'postgres', user, password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 12000 });
      try {
        console.log(`Tentando conexão: ${host}:${port} ...`);
        await client.connect();
        console.log('Conectou. Aplicando SQL...');
        await client.query(sql);
        const check = await client.query("select to_regclass('public.orcamento_workspace') as tabela");
        console.log(`Verificação: ${check.rows[0].tabela || 'não encontrada'}`);
        await client.end();
        return;
      } catch (err) {
        lastError = err;
        try { await client.end(); } catch {}
        console.log(`Falhou em ${host}:${port}: ${err.message.split('\n')[0]}`);
      }
    }
  }
  throw lastError || new Error('Não foi possível conectar no Supabase.');
}

main().catch((err) => {
  console.error('Erro ao aplicar migration:', err.message);
  process.exit(1);
});
