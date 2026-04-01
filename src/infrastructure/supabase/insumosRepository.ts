import { supabase } from './client'

export interface Insumo {
  id: string
  codigo: string
  descricao: string
  unidade: string
  fornecedor: string | null
  grupo: string | null
  custo_atual: number
  data_ultimo_preco: string | null
  dias_sem_atualizar: number | null
  observacao: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface InsumoHistorico {
  id: string
  insumo_id: string
  custo: number
  fornecedor: string | null
  data_cotacao: string
  origem: string
  observacao: string | null
  created_at: string
}

export interface FiltrosInsumos {
  busca?: string
  fornecedor?: string | null
  unidade?: string | null
  grupo?: string | null
  semFornecedor?: boolean
  alertaDias?: number | null
  ordenarPor?: 'descricao' | 'custo_atual' | 'dias_sem_atualizar' | 'fornecedor'
  ordem?: 'asc' | 'desc'
}

const POR_PAGINA = 50

async function listarValoresDistintos(
  campo: 'fornecedor' | 'unidade' | 'grupo',
  ignorarNulos = false
): Promise<string[]> {
  const PAGE = 1000
  let page = 0
  const valores = new Set<string>()

  while (true) {
    let query = supabase
      .from('insumos_view')
      .select(campo)
      .eq('ativo', true)
      .order(campo, { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1)

    if (ignorarNulos) {
      query = query.not(campo, 'is', null)
    }

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break

    for (const row of data as Record<string, string | null>[]) {
      const valor = row[campo]
      if (valor) valores.add(valor)
    }

    if (data.length < PAGE) break
    page++
  }

  const unique = [...valores]
  unique.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return unique
}

export const insumosRepository = {
  async listar(
    pagina = 0,
    filtros: FiltrosInsumos = {}
  ): Promise<{ data: Insumo[]; total: number }> {
    const colOrdem = filtros.ordenarPor ?? 'descricao'
    const ascOrdem = (filtros.ordem ?? 'asc') === 'asc'

    let query = supabase
      .from('insumos_view')
      .select('*', { count: 'exact' })
      .eq('ativo', true)
      .order(colOrdem, { ascending: ascOrdem })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

    if (filtros.busca) {
      query = query.or(
        `descricao.ilike.%${filtros.busca}%,fornecedor.ilike.%${filtros.busca}%,codigo.ilike.%${filtros.busca}%,grupo.ilike.%${filtros.busca}%`
      )
    }
    if (filtros.fornecedor) {
      query = query.eq('fornecedor', filtros.fornecedor)
    }
    if (filtros.unidade) {
      query = query.eq('unidade', filtros.unidade)
    }
    if (filtros.grupo === null) {
      query = query.is('grupo', null)
    } else if (filtros.grupo) {
      query = query.eq('grupo', filtros.grupo)
    }
    if (filtros.semFornecedor) {
      query = query.is('fornecedor', null)
    }
    if (filtros.alertaDias) {
      query = query.gte('dias_sem_atualizar', filtros.alertaDias)
    }

    const { data, count, error } = await query
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
  },

  async buscarPorId(id: string): Promise<Insumo | null> {
    const { data, error } = await supabase
      .from('insumos_view')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // Quick search for autocomplete — returns deduplicated suggestions by descricao
  async buscarSugestoes(busca: string): Promise<{ descricao: string; unidade: string; melhor_preco: number }[]> {
    if (!busca || busca.length < 2) return []
    const { data, error } = await supabase
      .from('insumos')
      .select('descricao, unidade, custo_atual')
      .eq('ativo', true)
      .ilike('descricao', `%${busca}%`)
      .order('descricao', { ascending: true })
      .limit(80)
    if (error) throw error
    // Deduplicate by descricao, keeping best (lowest positive) price
    const mapa = new Map<string, { descricao: string; unidade: string; melhor_preco: number }>()
    for (const row of data ?? []) {
      const existing = mapa.get(row.descricao)
      const preco = row.custo_atual ?? 0
      if (!existing || (preco > 0 && (existing.melhor_preco === 0 || preco < existing.melhor_preco))) {
        mapa.set(row.descricao, { descricao: row.descricao, unidade: row.unidade ?? '', melhor_preco: preco })
      }
    }
    return Array.from(mapa.values()).slice(0, 15)
  },

  async criar(insumo: Partial<Insumo>): Promise<Insumo> {
    const { data, error } = await supabase
      .from('insumos')
      .insert(insumo)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(id: string, campos: Partial<Insumo>): Promise<Insumo> {
    const { data, error } = await supabase
      .from('insumos')
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizarPreco(
    id: string,
    novoCusto: number,
    fornecedor?: string,
    observacao?: string
  ): Promise<void> {
    // 1. Registrar no histórico
    const { error: errHist } = await supabase
      .from('insumos_historico')
      .insert({
        insumo_id: id,
        custo: novoCusto,
        fornecedor,
        data_cotacao: new Date().toISOString(),
        origem: 'manual',
        observacao,
      })
    if (errHist) throw errHist

    // 2. Atualizar o custo atual
    const { error: errUpd } = await supabase
      .from('insumos')
      .update({
        custo_atual: novoCusto,
        data_ultimo_preco: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (errUpd) throw errUpd
  },

  async listarHistorico(insumoId: string): Promise<InsumoHistorico[]> {
    const { data, error } = await supabase
      .from('insumos_historico')
      .select('*')
      .eq('insumo_id', insumoId)
      .order('data_cotacao', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async listarFornecedores(): Promise<string[]> {
    return listarValoresDistintos('fornecedor', true)
  },

  async listarUnidades(): Promise<string[]> {
    return listarValoresDistintos('unidade', false)
  },

  async listarGrupos(): Promise<string[]> {
    return listarValoresDistintos('grupo', true)
  },

  /**
   * Busca TODOS os insumos ativos (paginando automaticamente).
   * Retorna campos resumidos para classificação hierárquica.
   */
  async listarTodos(): Promise<
    { id: string; descricao: string; fornecedor: string | null; custo_atual: number; unidade: string; data_ultimo_preco: string | null; dias_sem_atualizar: number | null }[]
  > {
    const PAGE = 1000
    let all: any[] = []
    let page = 0
    while (true) {
      const { data, error } = await supabase
        .from('insumos_view')
        .select('id,descricao,fornecedor,custo_atual,unidade,data_ultimo_preco,dias_sem_atualizar')
        .eq('ativo', true)
        .order('descricao', { ascending: true })
        .range(page * PAGE, (page + 1) * PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      all = all.concat(data)
      page++
    }
    return all
  },
}
