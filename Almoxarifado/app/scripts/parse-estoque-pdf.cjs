// Parser do PDF "Posições de Estoque Atual" (Sienge/Starian)
// Extrai os itens e gera SQL de INSERT para itens_almoxarifado
// Uso: node parse-estoque-pdf.cjs <texto-do-pdf.txt> > seed.sql

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Uso: node parse-estoque-pdf.cjs <arquivo-texto.txt>');
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, 'utf-8');

// Tokens para detectar grupo/família
const REGEX_GRUPO = /^Grupo\s+(\d{2})\s*-\s*(.+)$/i;
const REGEX_FAMILIA = /^Família\s+([\d.]+)\s*-\s*(.+)$/i;
// Item: "CODIGO - DESCRICAO UNIDADE QTD CUSTO_MEDIO ..."
// Ex: "5832 - ELETRODUTO FERRO PESADO. - 1 PRE ZINCADO NBR 7008 mt 20,0000 36,7600"
const REGEX_ITEM = /^(\d{1,6})\s*-\s*(.+?)\s+(mt|un|pç|pc|p|cx|pct|rl|br|m|ml|kg)\s+([\d.,]+)\s+([\d.,]+)\s*$/i;

function parseBR(n) {
  if (!n) return null;
  // "1.234,56" -> 1234.56
  const cleaned = String(n).replace(/\./g, '').replace(',', '.');
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? v : null;
}

function normUnidade(u) {
  const mapa = {
    'pç': 'un',
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
  return mapa[u.toLowerCase()] || 'un';
}

function escape(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''").trim() + "'";
}

const itens = [];
let grupoAtual = null;
let familiaAtual = null;

const linhas = raw.split(/\r?\n/);
for (const linhaRaw of linhas) {
  const linha = linhaRaw.trim();
  if (!linha) continue;

  const mGrupo = linha.match(REGEX_GRUPO);
  if (mGrupo) {
    grupoAtual = `${mGrupo[1]} - ${mGrupo[2]}`.trim();
    continue;
  }

  const mFam = linha.match(REGEX_FAMILIA);
  if (mFam) {
    familiaAtual = `${mFam[1]} - ${mFam[2]}`.trim();
    continue;
  }

  const mItem = linha.match(REGEX_ITEM);
  if (mItem) {
    const codigo = mItem[1];
    const descricao = mItem[2].replace(/\s+/g, ' ').trim();
    const unidade = normUnidade(mItem[3]);
    const quantidade = parseBR(mItem[4]) ?? 0;
    const custo = parseBR(mItem[5]);

    itens.push({
      codigo,
      descricao,
      unidade,
      estoque_atual: quantidade,
      preco_unitario: custo,
      grupo: grupoAtual,
      familia: familiaAtual,
    });
  }
}

console.error(`[parse] ${itens.length} itens extraídos`);

// Gera SQL em batches (chunks de 200)
const BATCH = 200;
console.log('-- Seed: itens do almoxarifado do PDF Sienge/Starian');
console.log('-- Total: ' + itens.length + ' itens');
console.log('');

for (let i = 0; i < itens.length; i += BATCH) {
  const chunk = itens.slice(i, i + BATCH);
  console.log('INSERT INTO public.itens_almoxarifado');
  console.log('  (codigo, descricao, unidade, estoque_atual, estoque_minimo, preco_unitario, grupo, familia, tipo, ativo) VALUES');
  const rows = chunk.map((it, idx) => {
    const sep = idx === chunk.length - 1 ? '' : ',';
    return `  (${escape(it.codigo)}, ${escape(it.descricao)}, ${escape(it.unidade)}, ${it.estoque_atual}, 0, ${it.preco_unitario ?? 'NULL'}, ${escape(it.grupo)}, ${escape(it.familia)}, 'material', true)${sep}`;
  });
  console.log(rows.join('\n'));
  console.log(`ON CONFLICT (codigo) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  unidade = EXCLUDED.unidade,
  estoque_atual = EXCLUDED.estoque_atual,
  preco_unitario = EXCLUDED.preco_unitario,
  grupo = EXCLUDED.grupo,
  familia = EXCLUDED.familia,
  atualizado_em = now();`);
  console.log('');
}

console.error('[parse] SQL gerado com sucesso');
