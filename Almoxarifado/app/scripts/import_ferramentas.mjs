import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const filePath = 'C:\\Users\\guilherme.moreira\\Downloads\\ferramentas estoque.xlsx';

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

    // Começamos o loop. 
    // Na nossa análise, a linha 1 da planilha (rawData[0]) parece conter os cabeçalhos amigáveis se lido como JSON simples.
    // Mas o sheet_to_json padrão pode ter consumido a primeira linha como keys.
    // Vamos processar a partir da primeira linha de dados reais detectada.

    rawData.forEach((row, index) => {
      // Mapeamento baseado no diagnóstico anterior:
      // __EMPTY_1: Nome do Produto
      // __EMPTY_6: Nº Patrimônio
      
      const nome = row['__EMPTY_1'];
      const patrimonio = row['__EMPTY_6'];
      
      if (!nome || nome === 'Nome do Produto') {
        skipped++;
        return;
      }

      // Se patrimônio estiver vazio, geramos um código
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

    // Upsert para evitar duplicados se o código já existir
    // Deduplicar localmente primeiro para evitar erro: 
    // "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueBatch = [];
    const seenCodes = new Set();
    
    for (let i = batch.length - 1; i >= 0; i--) {
      const item = batch[i];
      if (!seenCodes.has(item.codigo)) {
        uniqueBatch.push(item);
        seenCodes.has(item.codigo);
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
