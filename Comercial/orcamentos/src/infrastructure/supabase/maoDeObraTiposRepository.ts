import { supabase } from './client'

export interface MaoDeObraTipo {
  id: string
  nome: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export const maoDeObraTiposRepository = {
  async listarTodos(): Promise<MaoDeObraTipo[]> {
    const { data, error } = await supabase
      .from('mao_de_obra_tipos')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error
    return data || []
  },

  async listarAtivos(): Promise<MaoDeObraTipo[]> {
    const { data, error } = await supabase
      .from('mao_de_obra_tipos')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) throw error
    return data || []
  },

  async criar(nome: string): Promise<MaoDeObraTipo> {
    const { data, error } = await supabase
      .from('mao_de_obra_tipos')
      .insert({ nome })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async toggleAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase
      .from('mao_de_obra_tipos')
      .update({ ativo, atualizado_em: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('mao_de_obra_tipos')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
