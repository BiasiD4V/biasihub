import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const cwd = process.cwd();
const rawFileArg = process.argv[2] || 'scripts/estoque-raw.txt';
const envFileArg = process.argv[3] || '.env.local';

const rawFile = path.resolve(cwd, rawFileArg);
const envFile = path.resolve(cwd, envFileArg);

const REGEX_GRUPO = /^Grupo\s+(\d{2})\s*-\s*(.+)$/i;
const REGEX_FAMILIA = /^(Fam[ií]lia|FamÃ­lia)\s+([\d.]+)\s*-\s*(.+)$/i;
const REGEX_ITEM =
  /^(\d{1,8})\s*-\s*(.+?)\s+(mt|un|pç|pÃ§|pc|p|cx|pct|rl|br|m|ml|kg)\s+([\d.,]+)\s+([\d.,]+)\s*$/i;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    out[key] = value;
  }

  return out;
}

function parseBR(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeUnit(unit) {
  const map = {
    'pç': 'un',
    'pÃ§': 'un',
    'pc': 'un',
    'p': 'un',
    'mt': 'm',
    'ml': 'm',
    'rl': 'un',
    'br': 'un',
    'pct': 'un',
    'cx': 'cx',
    'un': 'un',
    'kg': 'kg',
    'm': 'm',
  };
  return map[String(unit).toLowerCase()] || 'un';
}

function parseRawItems(rawText) {
  let grupoAtual = null;
  let familiaAtual = null;
  let linhasComPadraoDeItemMasNaoLidas = 0;
  const itens = [];

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const mGrupo = line.match(REGEX_GRUPO);
    if (mGrupo) {
      grupoAtual = `${mGrupo[1]} - ${mGrupo[2]}`.trim();
      continue;
    }

    const mFamilia = line.match(REGEX_FAMILIA);
    if (mFamilia) {
      familiaAtual = `${mFamilia[2]} - ${mFamilia[3]}`.trim();
      continue;
    }

    const mItem = line.match(REGEX_ITEM);
    if (!mItem) {
      if (/^\d+\s*-/.test(line)) linhasComPadraoDeItemMasNaoLidas += 1;
      continue;
    }

    itens.push({
      codigo: mItem[1],
      descricao: mItem[2].replace(/\s+/g, ' ').trim(),
      unidade: normalizeUnit(mItem[3]),
      estoque_atual: parseBR(mItem[4]) ?? 0,
      estoque_minimo: 0,
      preco_unitario: parseBR(mItem[5]),
      grupo: grupoAtual,
      familia: familiaAtual,
      tipo: 'material',
      ativo: true,
    });
  }

  return { itens, linhasComPadraoDeItemMasNaoLidas };
}

function deduplicateByCodigo(items) {
  const map = new Map();
  for (const item of items) map.set(item.codigo, item);
  return [...map.values()];
}

async function run() {
  if (!fs.existsSync(rawFile)) {
    throw new Error(`Arquivo de entrada nao encontrado: ${rawFile}`);
  }

  const envFromFile = parseEnvFile(envFile);
  const supabaseUrl = process.env.VITE_SUPABASE_URL || envFromFile.VITE_SUPABASE_URL;
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY || envFromFile.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      `Variaveis de ambiente ausentes. Esperado: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (env file: ${envFile})`
    );
  }

  const rawText = fs.readFileSync(rawFile, 'utf8');
  const { itens, linhasComPadraoDeItemMasNaoLidas } = parseRawItems(rawText);
  const unicos = deduplicateByCodigo(itens);

  console.log(`[import] arquivo: ${rawFile}`);
  console.log(`[import] itens parseados: ${itens.length}`);
  console.log(`[import] itens unicos por codigo: ${unicos.length}`);
  console.log(`[import] linhas com padrao de item nao parseadas: ${linhasComPadraoDeItemMasNaoLidas}`);

  if (unicos.length === 0) {
    throw new Error('Nenhum item valido encontrado no arquivo de entrada.');
  }

  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const batchSize = 200;

  for (let i = 0; i < unicos.length; i += batchSize) {
    const chunk = unicos.slice(i, i + batchSize);
    const { error } = await supabase.from('itens_almoxarifado').upsert(chunk, {
      onConflict: 'codigo',
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Falha no upsert do lote ${i / batchSize + 1}: ${error.message}`);
    }

    console.log(
      `[import] lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(unicos.length / batchSize)} ok (${chunk.length} itens)`
    );
  }

  const { count, error: countError } = await supabase
    .from('itens_almoxarifado')
    .select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Erro ao contar itens apos import: ${countError.message}`);

  const { data: amostra, error: sampleError } = await supabase
    .from('itens_almoxarifado')
    .select('codigo,descricao,estoque_atual,preco_unitario,grupo,familia')
    .order('codigo', { ascending: true })
    .limit(5);
  if (sampleError) throw new Error(`Erro ao buscar amostra apos import: ${sampleError.message}`);

  console.log(`[import] total na tabela agora: ${count ?? 'n/d'}`);
  console.log('[import] amostra:');
  for (const row of amostra || []) {
    console.log(
      `  - ${row.codigo} | ${row.descricao} | qtd=${row.estoque_atual} | preco=${row.preco_unitario} | grupo=${row.grupo} | familia=${row.familia}`
    );
  }
}

run().catch((err) => {
  console.error(`[import] erro: ${err.message}`);
  process.exit(1);
});
