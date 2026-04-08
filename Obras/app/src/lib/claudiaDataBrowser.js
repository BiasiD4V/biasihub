// ============================================================
// ClaudIA Data Browser
// Busca schema dinâmico + executa queries baseado em Gemini
// ============================================================

import { supabase } from './supabase'

/**
 * Busca o schema completo do Supabase
 * @returns {Promise<Object>} Estrutura: { tabela: [colunas] }
 */
export async function getSupabaseSchema() {
  try {
    // Busca todas as tabelas do schema public
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_type', 'VIEW')

    if (!tables || tables.length === 0) {
      console.warn('Nenhuma tabela encontrada no schema')
      return {}
    }

    const schema = {}

    // Para cada tabela, busca as colunas
    for (const table of tables) {
      const tableName = table.table_name

      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)

      if (columns) {
        schema[tableName] = columns.map(col => ({
          nome: col.column_name,
          tipo: col.data_type,
          nulo: col.is_nullable === 'YES',
        }))
      }
    }

    return schema
  } catch (err) {
    console.error('Erro ao buscar schema:', err)
    return {}
  }
}

/**
 * Formata o schema em texto legível para o Gemini
 * @param {Object} schema - Schema do banco
 * @returns {string} Descrição em texto
 */
export function formatSchemaForGemini(schema) {
  let text = '[SCHEMA DO BANCO DE DADOS]\n\n'

  Object.entries(schema).forEach(([tabela, colunas]) => {
    text += `Tabela: ${tabela}\n`
    text += 'Colunas:\n'
    colunas.forEach(col => {
      const nullable = col.nulo ? ' (NULLABLE)' : ''
      text += `  - ${col.nome}: ${col.tipo}${nullable}\n`
    })
    text += '\n'
  })

  return text
}

/**
 * Busca dados de uma tabela com filtros
 * Simples e seguro - apenas SELECT com colunas específicas
 * @param {string} tabela - Nome da tabela
 * @param {Array<string>} colunas - Colunas a buscar
 * @param {Object} filtros - { coluna: valor, ... }
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>} Dados
 */
export async function executeDataQuery(tabela, colunas = '*', filtros = {}, limit = 100) {
  try {
    // Whitelist de tabelas permitidas (segurança)
    const tabelasPermitidas = [
      'obras',
      'planejamento_atividades',
      'planejamento_predecessoras',
      'contratos',
      'medicoes',
      'evm_snapshots',
      'avancos_fisicos',
      'pedidos_compra',
      'diario_obra',
      'tarefas',
      'recursos',
      'reprogramacoes',
      'obra_planejamentos',
    ]

    if (!tabelasPermitidas.includes(tabela)) {
      throw new Error(`Tabela não permitida: ${tabela}`)
    }

    // Limita limite para segurança
    const safeLimitLimit = Math.min(limit, 1000)

    let query = supabase.from(tabela).select(colunas).limit(safeLimitLimit)

    // Aplica filtros (apenas igualdade, por segurança)
    Object.entries(filtros).forEach(([coluna, valor]) => {
      if (valor !== null && valor !== undefined) {
        query = query.eq(coluna, valor)
      }
    })

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (err) {
    console.error(`Erro ao buscar ${tabela}:`, err)
    return []
  }
}

/**
 * Busca agregações (COUNT, SUM, AVG, etc)
 * @param {string} tabela - Nome da tabela
 * @param {string} agregacao - 'count', 'sum', 'avg', 'max', 'min'
 * @param {string} coluna - Coluna a agregar
 * @param {Object} filtros - Filtros
 * @returns {Promise<number>} Resultado
 */
export async function executeAggregation(tabela, agregacao = 'count', coluna = '*', filtros = {}) {
  try {
    const tabelasPermitidas = [
      'obras',
      'planejamento_atividades',
      'contratos',
      'medicoes',
      'evm_snapshots',
      'avancos_fisicos',
      'pedidos_compra',
    ]

    if (!tabelasPermitidas.includes(tabela)) {
      throw new Error(`Tabela não permitida: ${tabela}`)
    }

    const selectClause = `${coluna}.${agregacao}()`
    let query = supabase.from(tabela).select(selectClause)

    Object.entries(filtros).forEach(([col, valor]) => {
      if (valor !== null && valor !== undefined) {
        query = query.eq(col, valor)
      }
    })

    const { data, error } = await query.limit(1)

    if (error) throw error

    // Extrai o valor agregado
    if (data && data[0]) {
      const key = Object.keys(data[0])[0]
      return data[0][key]
    }
    return null
  } catch (err) {
    console.error(`Erro em agregação:`, err)
    return null
  }
}

/**
 * Busca estatísticas de uma obra completa
 * @param {string} obraId - ID da obra
 * @returns {Promise<Object>} Resumo completo
 */
export async function getObraStatistics(obraId) {
  try {
    // Busca obra
    const [obra] = await executeDataQuery('obras', '*', { id: obraId }, 1)

    // Busca planejamento
    const [obraPlanejamento] = await executeDataQuery(
      'obra_planejamentos',
      '*',
      { obra_id: obraId },
      1
    )

    const planejamentoId = obraPlanejamento?.id

    // Cronograma
    const atividades = planejamentoId
      ? await executeDataQuery('planejamento_atividades', '*', { planejamento_id: planejamentoId }, 1000)
      : []

    const criticas = atividades.filter(a => a.folga_total === 0)
    const emAtraso = atividades.filter(a => a.progresso_fisico < 50)

    // EVM
    const [evm] = await executeDataQuery('evm_snapshots', '*', { obra_id: obraId }, 1)

    // Contratos
    const contratos = await executeDataQuery('contratos', '*', { obra_id: obraId }, 100)

    // Medições
    const medicoes = await executeDataQuery('medicoes', '*', { obra_id: obraId }, 100)

    // Avanços
    const [ultimoAvanzo] = await executeDataQuery('avancos_fisicos', '*', { obra_id: obraId }, 1)

    return {
      obra: obra || null,
      cronograma: {
        total_atividades: atividades.length,
        criticas: criticas.length,
        em_atraso: emAtraso.length,
        progresso_medio: atividades.length > 0
          ? (atividades.reduce((sum, a) => sum + (a.progresso_fisico || 0), 0) / atividades.length).toFixed(2)
          : 0,
      },
      financeiro: {
        contratos: contratos.length,
        medicoes: medicoes.length,
        vp_total: evm?.vp_total || 0,
        va_total: evm?.va_total || 0,
        vr_total: evm?.vr_total || 0,
        idp: evm?.idp || 0,
        idc: evm?.idc || 0,
      },
      progresso: ultimoAvanzo?.percentual_global || 0,
    }
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err)
    return null
  }
}

export default {
  getSupabaseSchema,
  formatSchemaForGemini,
  executeDataQuery,
  executeAggregation,
  getObraStatistics,
}
