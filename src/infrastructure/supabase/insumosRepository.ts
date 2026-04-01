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
  alertaDias?: number | null
}

const POR_PAGINA = 50

export const insumosRepository = {
  async listar(
    pagina = 0,
    filtros: FiltrosInsumos = {}
  ): Promise<{ data: Insumo[]; total: number }> {
    let query = supabase
      .from('insumos_view')
      .select('*', { count: 'exact' })
      .eq('ativo', true)
      .order('descricao', { ascending: true })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

    if (filtros.busca) {
      query = query.or(
        `descricao.ilike.%${filtros.busca}%,fornecedor.ilike.%${filtros.busca}%,codigo.ilike.%${filtros.busca}%`
      )
    }
    if (filtros.fornecedor) {
      query = query.eq('fornecedor', filtros.fornecedor)
    }
    if (filtros.unidade) {
      query = query.eq('unidade', filtros.unidade)
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
    const { data, error } = await supabase
      .from('insumos_view')
      .select('fornecedor')
      .eq('ativo', true)
      .not('fornecedor', 'is', null)
    if (error) throw error
    const unique = [...new Set((data ?? []).map((r) => r.fornecedor as string))]
    unique.sort()
    return unique
  },

  async listarUnidades(): Promise<string[]> {
    const { data, error } = await supabase
      .from('insumos_view')
      .select('unidade')
      .eq('ativo', true)
    if (error) throw error
    const unique = [...new Set((data ?? []).map((r) => r.unidade))]
    unique.sort()
    return unique
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
