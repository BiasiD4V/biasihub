import { supabase } from './client'

export type SituacaoEscopo = 'Fechado' | 'Fechado com premissa' | 'Pendente' | 'Precisa validar'
export type RiscoEscopo = 'Baixo' | 'Médio' | 'Alto'
export type DisciplinaEscopo = string

export interface InclusoExclusoSupabase {
  id: string
  obra: string
  disciplina: DisciplinaEscopo | null
  area_ambiente: string | null
  item_servico: string
  antes_da_biasi: string | null
  o_que_biasi_faz: string | null
  onde_faz: string | null
  ate_onde_vai: string | null
  como_entrega: string | null
  quem_entra_depois: string | null
  o_que_nao_entra: string | null
  base_usada: string | null
  situacao: SituacaoEscopo
  risco: RiscoEscopo
  premissa: string | null
  pendencia: string | null
  responsavel: string | null
  criado_em: string
  atualizado_em: string
}

export const DISCIPLINAS_ESCOPO: DisciplinaEscopo[] = [
  'Elétrica', 'Hidráulica', 'Incêndio', 'Gás', 'SPDA',
  'Dados / Infraestrutura seca', 'Ar comprimido', 'HVAC',
]
export const SITUACOES_ESCOPO: SituacaoEscopo[] = ['Fechado', 'Fechado com premissa', 'Pendente', 'Precisa validar']
export const RISCOS_ESCOPO: RiscoEscopo[] = ['Baixo', 'Médio', 'Alto']
export const RESPONSAVEIS_ESCOPO = ['Paulo', 'Ryan', 'Luan', 'Giovanni', 'Jennifer']

export const inclusoExclusoRepository = {
  async listarTodos(): Promise<InclusoExclusoSupabase[]> {
    const { data, error } = await supabase
      .from('incluso_excluso')
      .select('*')
      .order('obra', { ascending: true })

    if (error) throw error
    return data || []
  },

  async criar(item: Omit<InclusoExclusoSupabase, 'id' | 'criado_em' | 'atualizado_em'>): Promise<InclusoExclusoSupabase> {
    const { data, error } = await supabase
      .from('incluso_excluso')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async atualizar(id: string, item: Partial<InclusoExclusoSupabase>): Promise<InclusoExclusoSupabase> {
    const { data, error } = await supabase
      .from('incluso_excluso')
      .update({ ...item, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async excluir(id: string): Promise<void> {
    const { error } = await supabase
      .from('incluso_excluso')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
