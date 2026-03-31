import { supabase } from './client'

export interface ProfissionalSupabase {
  id: string
  composicao_id: string
  profissao: string
  unid: string
  coef: number | null
  hh_total: number | null
  ordem: number
  criado_em: string
  atualizado_em: string
}

export interface ComposicaoMOSupabase {
  id: string
  obra: string
  atividade: string
  jornada: number
  unid: string
  qtd: number | null
  tempo_dias: number | null
  total_hh: number | null
  criado_em: string
  atualizado_em: string
  mao_de_obra_profissionais?: ProfissionalSupabase[]
}

export const maoDeObraRepository = {
  async listarTodos(): Promise<ComposicaoMOSupabase[]> {
    const { data, error } = await supabase
      .from('mao_de_obra_composicoes')
      .select(`*, mao_de_obra_profissionais(*)`)
      .order('obra', { ascending: true })
      .order('atividade', { ascending: true })

    if (error) throw error

    // Ordenar profissionais por ordem dentro de cada composição
    return (data || []).map((c) => ({
      ...c,
      mao_de_obra_profissionais: (c.mao_de_obra_profissionais || []).sort(
        (a: ProfissionalSupabase, b: ProfissionalSupabase) => a.ordem - b.ordem
      ),
    }))
  },

  async criar(
    composicao: Omit<ComposicaoMOSupabase, 'id' | 'criado_em' | 'atualizado_em' | 'mao_de_obra_profissionais'>
  ): Promise<ComposicaoMOSupabase> {
    const { data, error } = await supabase
      .from('mao_de_obra_composicoes')
      .insert(composicao)
      .select()
      .single()

    if (error) throw error
    return { ...data, mao_de_obra_profissionais: [] }
  },

  async atualizar(
    id: string,
    composicao: Partial<Omit<ComposicaoMOSupabase, 'mao_de_obra_profissionais'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('mao_de_obra_composicoes')
      .update({ ...composicao, atualizado_em: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('mao_de_obra_composicoes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Substitui todos os profissionais de uma composição (delete + insert)
  async salvarProfissionais(
    composicaoId: string,
    profissionais: Array<{ profissao: string; unid: string; coef: number | null; hh_total: number | null }>
  ): Promise<ProfissionalSupabase[]> {
    // 1. Apagar os existentes
    const { error: deleteError } = await supabase
      .from('mao_de_obra_profissionais')
      .delete()
      .eq('composicao_id', composicaoId)

    if (deleteError) throw deleteError

    if (profissionais.length === 0) return []

    // 2. Inserir novos com ordem preservada
    const rows = profissionais.map((p, i) => ({
      composicao_id: composicaoId,
      profissao: p.profissao,
      unid: p.unid,
      coef: p.coef,
      hh_total: p.hh_total,
      ordem: i,
    }))

    const { data, error: insertError } = await supabase
      .from('mao_de_obra_profissionais')
      .insert(rows)
      .select()

    if (insertError) throw insertError
    return data || []
  },
}
