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
    if (idx !== -1) out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, '');
  }
  return out;
}
(async () => {
  const root = path.resolve(__dirname, '..');
  const env = { ...loadEnv(path.join(root, '.env')), ...loadEnv(path.join(root, '.env.local')), ...process.env };
  const ref = (env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1];
  const password = env.SUPABASE_DB_PASSWORD;
  const regions = ['sa-east-1','us-east-1','us-west-1','us-west-2','us-east-2','eu-west-1','eu-west-2','eu-central-1','ap-southeast-1','ap-northeast-1','ap-south-1','ap-southeast-2'];
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client({ host, port: 6543, database: 'postgres', user: `postgres.${ref}`, password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 7000 });
    try {
      process.stdout.write(`Testando ${region}... `);
      await client.connect();
      const r = await client.query('select current_database() as db');
      console.log(`OK (${r.rows[0].db})`);
      await client.end();
      return;
    } catch (e) {
      console.log(e.message.split('\n')[0]);
      try { await client.end(); } catch {}
    }
  }
  process.exit(1);
})();
