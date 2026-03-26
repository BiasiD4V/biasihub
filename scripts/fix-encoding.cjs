const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vzaabtzcilyoknksvhrc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjQyNDYsImV4cCI6MjA5MDEwMDI0Nn0.L0nCAztRmHFTaJAoT22P_Y5eHUNG9-HStY3it1nSq1U'
);

// Mapa de correções de encoding (mojibake UTF-8 duplo)
const fixEncoding = {
  'Ã‡Ãƒ': 'ÇÃ', 'Ã§Ã£': 'çã', 'Ã‡': 'Ç', 'Ã§': 'ç',
  'Ãƒ': 'Ã', 'Ã£': 'ã', 'Ã‰': 'É', 'Ã©': 'é',
  'Ãš': 'Ú', 'Ãº': 'ú', 'Ã"': 'Ó', 'Ã³': 'ó',
  'Ã"': 'Ô', 'Ã´': 'ô', 'Ã': 'Í', 'Ã­': 'í',
  'Ã‚': 'Â', 'Ã¢': 'â', 'Ãœ': 'Ü', 'Ã¼': 'ü',
  'Ã•': 'Õ', 'Ãµ': 'õ', 'Ã€': 'À', 'Ã ': 'à',
  'Ãˆ': 'È', 'Ã¨': 'è', 'Ã': 'Á', 'Ã¡': 'á',
  'Ã‰': 'É',
};

function corrigirTexto(texto) {
  if (!texto) return texto;
  let resultado = texto;

  // Tentar decodificar como double-UTF8
  try {
    // Converter string para bytes Latin-1, depois interpretar como UTF-8
    const bytes = Buffer.from(resultado, 'latin1');
    const decoded = bytes.toString('utf8');
    // Verificar se a decodificação produziu algo válido (sem caracteres de substituição)
    if (!decoded.includes('\ufffd') && decoded.length < resultado.length) {
      return decoded;
    }
  } catch (e) {}

  // Fallback: substituição manual
  for (const [broken, fixed] of Object.entries(fixEncoding)) {
    resultado = resultado.split(broken).join(fixed);
  }

  // Corrigir sequências comuns específicas
  resultado = resultado
    .replace(/Ã‡ÃƒO/g, 'ÇÃO')
    .replace(/Ã§Ã£o/g, 'ção')
    .replace(/Ã‡Ã•ES/g, 'ÇÕES')
    .replace(/Ã§Ãµes/g, 'ções')
    .replace(/Ãƒo/g, 'ão')
    .replace(/TÃ‰/g, 'TÉ')
    .replace(/LÃ‰/g, 'LÉ')
    .replace(/NÃ‰/g, 'NÉ')
    .replace(/Ã"/g, 'Ô')
    .replace(/SÃƒO/g, 'SÃO');

  return resultado;
}

function temEncodingQuebrado(texto) {
  if (!texto) return false;
  return /Ã[‡ƒ©"‰š‚œ•€ˆ­¡³´¢¼µ ¨º]/.test(texto) ||
         /Ã[A-Z]/.test(texto) && texto.includes('Ã');
}

async function corrigirClientes() {
  console.log('--- Corrigindo CLIENTES ---');
  const { data: clientes, error } = await supabase.from('clientes').select('*');
  if (error) { console.error('Erro:', error); return; }

  let corrigidos = 0;
  for (const cli of clientes) {
    const updates = {};
    if (temEncodingQuebrado(cli.nome)) {
      updates.nome = corrigirTexto(cli.nome);
    }
    if (temEncodingQuebrado(cli.cidade)) {
      updates.cidade = corrigirTexto(cli.cidade);
    }
    if (temEncodingQuebrado(cli.contato_nome)) {
      updates.contato_nome = corrigirTexto(cli.contato_nome);
    }

    if (Object.keys(updates).length > 0) {
      console.log(`  Corrigindo: "${cli.nome}" -> "${updates.nome || cli.nome}"`);
      const { error: upErr } = await supabase.from('clientes').update(updates).eq('id', cli.id);
      if (upErr) console.error(`  ERRO: ${upErr.message}`);
      else corrigidos++;
    }
  }
  console.log(`Clientes corrigidos: ${corrigidos}/${clientes.length}\n`);
}

async function corrigirOrcamentos() {
  console.log('--- Corrigindo ORCAMENTOS ---');
  const { data: orcs, error } = await supabase.from('orcamentos').select('*');
  if (error) { console.error('Erro:', error); return; }

  let corrigidos = 0;
  for (const orc of orcs) {
    const updates = {};
    if (temEncodingQuebrado(orc.nome_obra)) {
      updates.nome_obra = corrigirTexto(orc.nome_obra);
    }
    if (temEncodingQuebrado(orc.objeto)) {
      updates.objeto = corrigirTexto(orc.objeto);
    }
    if (temEncodingQuebrado(orc.disciplina)) {
      updates.disciplina = corrigirTexto(orc.disciplina);
    }
    if (temEncodingQuebrado(orc.responsavel)) {
      updates.responsavel = corrigirTexto(orc.responsavel);
    }

    if (Object.keys(updates).length > 0) {
      console.log(`  Corrigindo: "${orc.nome_obra}" -> "${updates.nome_obra || orc.nome_obra}"`);
      const { error: upErr } = await supabase.from('orcamentos').update(updates).eq('id', orc.id);
      if (upErr) console.error(`  ERRO: ${upErr.message}`);
      else corrigidos++;
    }
  }
  console.log(`Orcamentos corrigidos: ${corrigidos}/${orcs.length}\n`);
}

async function main() {
  console.log('=== CORRECAO DE ENCODING - BIASI HUB ===\n');
  await corrigirClientes();
  await corrigirOrcamentos();
  console.log('=== CONCLUIDO ===');
}

main().catch(console.error);
