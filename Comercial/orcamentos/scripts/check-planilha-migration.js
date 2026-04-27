#!/usr/bin/env node

const PAT = process.env.SUPABASE_PAT;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'vzaabtzcilyoknksvhrc';

if (!PAT) {
  console.error('Erro: defina SUPABASE_PAT antes de rodar.');
  console.error('Exemplo (PowerShell): $env:SUPABASE_PAT="sbp_xxx"; npm.cmd run check:planilha');
  process.exit(1);
}

const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const checks = [
  {
    name: 'tabelas_planilha',
    query:
      "SELECT to_regclass('public.planilhas_orcamentarias') AS planilhas_tbl, to_regclass('public.planilha_itens') AS itens_tbl;",
  },
  {
    name: 'view_planilha',
    query:
      "SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name='planilhas_orcamentarias_view';",
  },
  {
    name: 'funcao_proximo_numero',
    query:
      "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='proximo_numero_planilha';",
  },
  {
    name: 'execucao_funcao',
    query: 'SELECT public.proximo_numero_planilha() AS proximo;',
  },
];

async function runQuery(query) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${bodyText}`);
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

function okRow(name, details) {
  return { name, ok: true, details };
}

function failRow(name, error) {
  return { name, ok: false, details: String(error) };
}

(async () => {
  const results = [];

  for (const check of checks) {
    try {
      const data = await runQuery(check.query);
      results.push(okRow(check.name, data));
    } catch (error) {
      results.push(failRow(check.name, error));
    }
  }

  const failed = results.filter((r) => !r.ok);

  console.log('\n=== CHECK PLANILHA ORCAMENTARIA ===');
  console.log(`Projeto: ${PROJECT_REF}`);
  console.log('');

  for (const row of results) {
    const mark = row.ok ? 'OK' : 'ERRO';
    console.log(`[${mark}] ${row.name}`);
    console.log(
      typeof row.details === 'string'
        ? row.details
        : JSON.stringify(row.details, null, 2)
    );
    console.log('---');
  }

  if (failed.length > 0) {
    console.error(`Falhou em ${failed.length} check(s).`);
    process.exit(1);
  }

  console.log('Tudo certo: migration da planilha validada com sucesso.');
})();
