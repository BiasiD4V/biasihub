import { supabase } from './client'

export interface OrcamentoSupabase {
  id: string
  numero: string
  cliente_id: string | null
  nome_obra: string
  objeto: string | null
  disciplina: string | null
  responsavel: string | null
  status: string
  valor_orcado: number | null
  valor_material: number | null
  valor_mao_obra: number | null
  chance_fechamento: string | null
  valor_estrategico: string | null
  urgencia: string | null
  score_abc: number | null
  classe_abc: string | null
  link_arquivo: string | null
  proxima_acao: string | null
  data_proxima_acao: string | null
  data_envio: string | null
  data_entrada: string | null
  criado_em: string
  atualizado_em: string
  clientes?: {
    id: string
    nome: string
    tipo: string | null
    cidade: string | null
    estado: string | null
  }
}

export const orcamentosRepository = {
  async listarTodos(): Promise<OrcamentoSupabase[]> {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`
        *,
        clientes (id, nome, tipo, cidade, estado)
      `)
      .order('criado_em', { ascending: false })

    if (error) throw error
    return data || []
  },

  async buscarPorId(id: string): Promise<OrcamentoSupabase | null> {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`
        *,
        clientes (id, nome, tipo, cidade, estado)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async criar(orcamento: Partial<OrcamentoSupabase>): Promise<OrcamentoSupabase> {
    const { data, error } = await supabase
      .from('orcamentos')
      .insert(orcamento)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async atualizar(id: string, orcamento: Partial<OrcamentoSupabase>): Promise<OrcamentoSupabase> {
    const { data, error } = await supabase
      .from('orcamentos')
      .update({ ...orcamento, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async buscarPorStatus(status: string): Promise<OrcamentoSupabase[]> {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`*, clientes (id, nome, tipo, cidade, estado)`)
      .eq('status', status)
      .order('criado_em', { ascending: false })

    if (error) throw error
    return data || []
  },

  async buscarPorClasseABC(classe: string): Promise<OrcamentoSupabase[]> {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`*, clientes (id, nome, tipo, cidade, estado)`)
      .eq('classe_abc', classe)
      .order('score_abc', { ascending: false })

    if (error) throw error
    return data || []
  }
}
