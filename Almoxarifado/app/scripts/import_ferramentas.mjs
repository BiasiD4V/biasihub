import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const filePath = process.env.FILE_PATH || 'ferramentas.xlsx'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY antes de rodar.')
  console.error('   Exemplo: VITE_SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=eyJ... FILE_PATH=caminho.xlsx node scripts/import_ferramentas.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importFerramentas() {
  console.log('--- Iniciando Importação de Ferramentas ---');

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Linhas encontradas: ${rawData.length}`);

    const batch = [];
    let skipped = 0;

    rawData.forEach((row, index) => {
      const nome = row['__EMPTY_1'];
      const patrimonio = row['__EMPTY_6'];

      if (!nome || nome === 'Nome do Produto') {
        skipped++;
        return;
      }

      const codigo = patrimonio ? String(patrimonio).trim().toUpperCase() : `FER-AUTO-${index + 1}`;

      batch.push({
        codigo,
        descricao: String(nome).trim(),
        unidade: String(row['__EMPTY_3'] || 'un').toLowerCase(),
        estoque_atual: parseFloat(row['__EMPTY_2']) || 0,
        estoque_minimo: parseFloat(row['__EMPTY_13']) || 0,
        localizacao: row['__EMPTY_8'] ? String(row['__EMPTY_8']).trim() : null,
        categoria: row['__EMPTY_10'] ? String(row['__EMPTY_10']).trim() : null,
        marca: row['__EMPTY_11'] ? String(row['__EMPTY_11']).trim() : null,
        tipo: 'ferramenta',
        ativo: true
      });
    });

    console.log(`Processados para inserção: ${batch.length}`);
    if (skipped > 0) console.log(`Linhas ignoradas (cabeçalhos ou vazias): ${skipped}`);

    if (batch.length === 0) {
      console.log('Nenhum dado válido encontrado para importar.');
      return;
    }

    const uniqueBatch = [];
    const seenCodes = new Set();

    for (let i = batch.length - 1; i >= 0; i--) {
      const item = batch[i];
      if (!seenCodes.has(item.codigo)) {
        uniqueBatch.push(item);
        seenCodes.add(item.codigo);
      }
    }

    console.log(`Enviando ${uniqueBatch.length} registros únicos para o Supabase...`);

    const { error } = await supabase
      .from('itens_almoxarifado')
      .upsert(uniqueBatch, { onConflict: 'codigo' });

    if (error) {
      console.error('Erro ao inserir no banco:', error.message);
    } else {
      console.log('✅ Importação finalizada com sucesso!');
    }

  } catch (err) {
    console.error('Falha crítica:', err.message);
  }
}

importFerramentas();
