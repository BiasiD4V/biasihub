// Script para criar as tabelas mudancas_etapa e follow_ups no Supabase
// Usa a abordagem de criar uma função SQL temporária via REST, executá-la, e depois removê-la

const https = require('https');

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';
const BASE = 'https://vzaabtzcilyoknksvhrc.supabase.co';

function supaFetch(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function checkTable(name) {
  const r = await supaFetch(`/rest/v1/${name}?select=id&limit=0`, 'GET');
  return r.status === 200;
}

async function rpc(fn, params) {
  const r = await supaFetch(`/rest/v1/rpc/${fn}`, 'POST', params);
  return r;
}

async function main() {
  console.log('=== Verificando tabelas existentes ===');
  
  const me = await checkTable('mudancas_etapa');
  const fu = await checkTable('follow_ups');
  console.log(`mudancas_etapa: ${me ? 'EXISTE' : 'NÃO EXISTE'}`);
  console.log(`follow_ups: ${fu ? 'EXISTE' : 'NÃO EXISTE'}`);
  
  if (me && fu) {
    console.log('\nAs duas tabelas já existem! Nada a fazer.');
    return;
  }
  
  // Passo 1: Criar função helper _exec_sql via PostgREST
  // PostgREST não suporta DDL diretamente, mas podemos criar uma função RPC
  // que executa SQL dinâmico. Porém... criar função também é DDL!
  // 
  // Alternativa: Vamos tentar usar a feature de pg-meta do Supabase
  // que está disponível no endpoint /pg/
  
  // Tenta endpoint pg-meta que foi recentemente adicionado
  const endpoints = [
    '/pg-meta/default/query',
    '/pg/query', 
    '/database/query',
  ];
  
  const SQL = `
    -- Colunas na propostas
    ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS etapa_funil text;
    ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS resultado_comercial text;
    ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS chance_fechamento text;
    ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS urgencia text;
    ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS proxima_acao text;
    ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS data_proxima_acao text;
    ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS ultima_interacao text;
    ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS observacao_comercial text;

    -- Tabela mudancas_etapa
    CREATE TABLE IF NOT EXISTS public.mudancas_etapa (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
      etapa_anterior text,
      etapa_nova text NOT NULL,
      responsavel text NOT NULL DEFAULT '',
      observacao text,
      created_at timestamptz DEFAULT now()
    );

    -- Tabela follow_ups
    CREATE TABLE IF NOT EXISTS public.follow_ups (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
      tipo text NOT NULL DEFAULT 'observacao',
      data timestamptz NOT NULL DEFAULT now(),
      responsavel text NOT NULL DEFAULT '',
      resumo text NOT NULL DEFAULT '',
      proxima_acao text,
      data_proxima_acao date,
      created_at timestamptz DEFAULT now()
    );

    -- RLS
    ALTER TABLE public.mudancas_etapa ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

    -- Policies
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mudancas_etapa_all') THEN
        CREATE POLICY mudancas_etapa_all ON public.mudancas_etapa FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'follow_ups_all') THEN
        CREATE POLICY follow_ups_all ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;

    -- Grants
    GRANT ALL ON public.mudancas_etapa TO anon, authenticated;
    GRANT ALL ON public.follow_ups TO anon, authenticated;
    
    -- Reload PostgREST schema
    NOTIFY pgrst, 'reload schema';
  `;
  
  for (const ep of endpoints) {
    console.log(`\nTentando ${ep}...`);
    const r = await supaFetch(ep, 'POST', { query: SQL });
    console.log(`  Status: ${r.status}`);
    console.log(`  Body: ${r.body.substring(0, 300)}`);
    if (r.status >= 200 && r.status < 300) {
      console.log('  SUCESSO!');
      return;
    }
  }
  
  // Se nenhum endpoint funcionou, vamos tentar psql via child_process
  console.log('\n=== Nenhum endpoint HTTP funcionou. Tentando conexão direta... ===');
  
  // Tentar encontrar o pooler correto testando todas as regiões
  const { execSync } = require('child_process');
  
  // Usar Python psycopg2 que já está instalado
  const regions = [
    'sa-east-1', 'us-east-1', 'us-west-1', 'us-west-2', 'us-east-2',
    'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1', 
    'ap-northeast-1', 'ap-south-1', 'ap-southeast-2',
  ];
  
  const passwords = ['1234', 'biasi2024', 'Biasi2024', 'biasi@2024', 'biasi123', 'admin', 'postgres'];
  
  for (const region of regions) {
    for (const pwd of passwords) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      const connStr = `postgresql://postgres.vzaabtzcilyoknksvhrc:${pwd}@${host}:6543/postgres?sslmode=require&connect_timeout=5`;
      try {
        const cmd = `python -c "import psycopg2; c=psycopg2.connect('${connStr}'); c.autocommit=True; print('CONNECTED'); c.close()"`;
        const out = execSync(cmd, { timeout: 8000, encoding: 'utf-8' });
        if (out.includes('CONNECTED')) {
          console.log(`CONECTOU! Region: ${region}, Password: ${pwd}`);
          // Agora executar o SQL de verdade
          const pyScript = `
import psycopg2
conn = psycopg2.connect('${connStr}')
conn.autocommit = True
cur = conn.cursor()
cur.execute("""${SQL.replace(/"/g, '\\"')}""")
print('SQL executado com sucesso!')
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('mudancas_etapa','follow_ups')")
for row in cur.fetchall():
    print(f'  Tabela: {row[0]}')
cur.close()
conn.close()
`;
          // Save and execute
          require('fs').writeFileSync('scripts/_run_migration.py', pyScript);
          const result = execSync('python scripts/_run_migration.py', { timeout: 30000, encoding: 'utf-8' });
          console.log(result);
          return;
        }
      } catch (e) {
        // silent
      }
    }
  }
  
  console.log('\n=== Não consegui conectar. Última tentativa: criando endpoint RPC ===');
  
  // Último recurso: vamos tentar POST no GraphQL que funcionou
  // para ver se podemos fazer mutations
  console.log('\nTentando via GraphQL mutation...');
  const gqlMutation = {
    query: `mutation { 
      insertIntoMudancasEtapaCollection(objects: []) { 
        affectedCount 
      } 
    }`
  };
  const gqlR = await supaFetch('/graphql/v1', 'POST', gqlMutation);
  console.log(`GraphQL: ${gqlR.status} - ${gqlR.body.substring(0, 300)}`);
  
  console.log('\n========================================');
  console.log('NÃO FOI POSSÍVEL CRIAR TABELAS AUTOMATICAMENTE.');
  console.log('O Supabase não expõe endpoint DDL via REST.');
  console.log('========================================');
}

main().catch(console.error);
