const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  'https://vzaabtzcilyoknksvhrc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjQyNDYsImV4cCI6MjA5MDEwMDI0Nn0.L0nCAztRmHFTaJAoT22P_Y5eHUNG9-HStY3it1nSq1U'
);

const EXCEL_PATH = 'C:/Users/Ryan/Downloads/PLATAFORMA - BIASIHUB/CONTROLE DE PROPOSTAS-2025.xlsm';

function lerExcel() {
  const wb = XLSX.readFile(EXCEL_PATH, { codepage: 65001 }); // UTF-8
  const ws = wb.Sheets['CONTROLE'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

  // Pular cabeçalho (primeiras 5 linhas)
  const rows = data.slice(5).filter(r => r[5] && String(r[5]).trim() !== '');

  const clientesSet = new Map(); // nome_upper -> nome_original
  const propostas = [];

  rows.forEach(r => {
    const cliente = String(r[5] || '').trim();
    const obra = String(r[6] || '').trim();
    const objeto = String(r[7] || '').trim();
    const disciplina = String(r[8] || '').trim();
    const responsavel = String(r[9] || '').trim();
    const valorOrcado = parseFloat(String(r[10] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || null;
    const valorMat = parseFloat(String(r[11] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || null;
    const valorMO = parseFloat(String(r[12] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || null;
    const status = String(r[13] || '').trim();
    const numero = String(r[3] || '').trim();
    const dataEntrada = r[4] ? String(r[4]).trim() : null;

    if (cliente) {
      clientesSet.set(cliente.toUpperCase(), cliente);
    }

    propostas.push({
      numero, dataEntrada, cliente, obra, objeto, disciplina,
      responsavel, valorOrcado, valorMat, valorMO, status
    });
  });

  return { clientes: Array.from(clientesSet.values()), propostas };
}

function formatarNome(nome) {
  return nome.split(' ').map(p => {
    const upper = p.toUpperCase();
    if (['LTDA', 'SA', 'EPP', 'ME', 'S.A.', 'S/A'].includes(upper)) return upper;
    if (p.length <= 2) return upper; // DE, DA, DO, etc.
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join(' ');
}

function parseData(dataStr) {
  if (!dataStr) return null;
  // Tentar formatos comuns: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, number (Excel serial)
  const num = Number(dataStr);
  if (!isNaN(num) && num > 40000 && num < 50000) {
    // Excel serial date
    const d = new Date((num - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  if (dataStr.includes('/')) {
    const parts = dataStr.split('/');
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
    }
  }
  return null;
}

function mapearStatus(statusExcel) {
  const map = {
    'RECEBIDO': 'recebido',
    'ORCAMENTO': 'em_andamento',
    'ENVIADO': 'enviado',
    'CLIENTE NAO DEU RETORNO': 'negociacao',
    'EM REVISAO': 'em_revisao',
    'NEGOCIACAO FUTURA': 'negociacao_futura',
    'NEGOCIACAO': 'negociacao',
    'FECHADO': 'fechado',
    'DECLINADO': 'cancelado',
    'CANCELADO': 'cancelado',
    'NAO FECHADO': 'cancelado',
  };
  return map[statusExcel?.toUpperCase()] || 'recebido';
}

// Valores aceitos pelo check constraint do Supabase
function mapearDisciplina(discExcel) {
  const map = {
    'LOTEAMENTO': 'loteamento',
    'INDUSTRIAL': 'industrial',
    'PREDIAL': 'predial',
    'PROJETO': 'projeto',
    'LICITACAO': 'licitacao',
    'LICITAÇÃO': 'licitacao',
    'GALPAO': 'outro',
    'GALPÃO': 'outro',
    'ILUMINACAO': 'outro',
    'ILUMINAÇÃO': 'outro',
    'HOSPITAL': 'outro',
    'ARENA': 'outro',
  };
  return map[discExcel?.toUpperCase()] || 'outro';
}

function mapearTipoCliente(nomeCliente) {
  const nome = nomeCliente.toUpperCase();
  if (nome.includes('PREFEITURA')) return 'prefeitura';
  if (nome.includes('CONSTRUTORA') || nome.includes('CONSTRUDESIGN')) return 'construtora';
  if (nome.includes('MINERADORA') || nome.includes('GRANEL') || nome.includes('NEMERA') ||
      nome.includes('CACAU') || nome.includes('MARCAMIX') || nome.includes('FLUID') ||
      nome.includes('ALFALOG') || nome.includes('TOYOTA') || nome.includes('YANMAR')) return 'industria';
  if (nome.includes('SUPERMERCADO') || nome.includes('CLUBE') || nome.includes('COLEGIO') ||
      nome.includes('ACADEMIA') || nome.includes('HOSPITAL')) return 'comercio';
  return 'outro';
}

async function limparDados() {
  console.log('Limpando dados existentes...');

  // Deletar orcamentos primeiro (FK para clientes)
  const { error: errOrc } = await supabase.from('orcamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errOrc) console.error('Erro ao limpar orcamentos:', errOrc.message);
  else console.log('  Orcamentos limpos');

  // Deletar clientes
  const { error: errCli } = await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errCli) console.error('Erro ao limpar clientes:', errCli.message);
  else console.log('  Clientes limpos');
}

async function importarClientes(clientes) {
  console.log(`\nImportando ${clientes.length} clientes...`);

  const clientesData = clientes.map(nome => ({
    nome: formatarNome(nome),
    tipo: mapearTipoCliente(nome),
    ativo: true,
  }));

  // Inserir em lotes de 20
  const clienteIds = new Map(); // nome_upper -> id

  for (let i = 0; i < clientesData.length; i += 20) {
    const lote = clientesData.slice(i, i + 20);
    const { data, error } = await supabase.from('clientes').insert(lote).select('id, nome');
    if (error) {
      console.error(`  Erro no lote ${i}: ${error.message}`);
    } else {
      data.forEach(cli => {
        clienteIds.set(cli.nome.toUpperCase(), cli.id);
      });
      console.log(`  Lote ${i+1}-${i+lote.length}: OK`);
    }
  }

  console.log(`Clientes importados: ${clienteIds.size}`);
  return clienteIds;
}

async function importarOrcamentos(propostas, clienteIds) {
  console.log(`\nImportando ${propostas.length} orcamentos...`);

  const orcamentosData = propostas.map(p => {
    const clienteNomeFormatado = formatarNome(p.cliente).toUpperCase();
    const clienteId = clienteIds.get(clienteNomeFormatado) ||
                      clienteIds.get(p.cliente.toUpperCase()) || null;

    return {
      numero: p.numero,
      cliente_id: clienteId,
      nome_obra: p.obra || p.objeto || 'Sem nome',
      objeto: p.objeto || null,
      disciplina: mapearDisciplina(p.disciplina),
      responsavel: p.responsavel || null,
      status: mapearStatus(p.status),
      valor_orcado: p.valorOrcado,
      valor_material: p.valorMat,
      valor_mao_obra: p.valorMO,
      data_entrada: parseData(p.dataEntrada),
    };
  });

  let total = 0;
  for (let i = 0; i < orcamentosData.length; i += 20) {
    const lote = orcamentosData.slice(i, i + 20);
    const { data, error } = await supabase.from('orcamentos').insert(lote).select('id');
    if (error) {
      console.error(`  Erro no lote ${i}: ${error.message}`);
      // Tentar um a um para identificar o problemático
      for (const orc of lote) {
        const { error: errSingle } = await supabase.from('orcamentos').insert(orc).select('id');
        if (errSingle) {
          console.error(`    Falha: ${orc.numero} - ${orc.nome_obra}: ${errSingle.message}`);
        } else {
          total++;
        }
      }
    } else {
      total += data.length;
      console.log(`  Lote ${i+1}-${i+lote.length}: OK`);
    }
  }

  console.log(`Orcamentos importados: ${total}`);
}

async function main() {
  console.log('=== IMPORTACAO BIASI HUB - DADOS REAIS ===\n');

  // 1. Ler Excel
  console.log('Lendo Excel...');
  const { clientes, propostas } = lerExcel();
  console.log(`  ${clientes.length} clientes unicos`);
  console.log(`  ${propostas.length} propostas`);

  // Mostrar amostra dos nomes para verificar encoding
  console.log('\n--- Amostra de nomes (verificar encoding) ---');
  clientes.slice(0, 10).forEach(c => console.log(`  ${c}`));

  // 2. Limpar dados existentes
  await limparDados();

  // 3. Importar clientes
  const clienteIds = await importarClientes(clientes);

  // 4. Importar orcamentos
  await importarOrcamentos(propostas, clienteIds);

  console.log('\n=== IMPORTACAO CONCLUIDA ===');
}

main().catch(console.error);
