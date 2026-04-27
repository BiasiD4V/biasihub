import { supabase } from './client'

export interface ResponsavelComercial {
  id: string
  nome: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export const responsaveisComerciaisRepository = {
  async listarTodos(): Promise<ResponsavelComercial[]> {
    const { data, error } = await supabase
      .from('responsaveis_comerciais')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error
    return (data || []) as ResponsavelComercial[]
  },

  async criar(nome: string): Promise<ResponsavelComercial> {
    const { data, error } = await supabase
      .from('responsaveis_comerciais')
      .insert({ nome: nome.trim(), ativo: true })
      .select('*')
      .single()

    if (error) throw error
    return data as ResponsavelComercial
  },

  async atualizarAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase
      .from('responsaveis_comerciais')
      .update({ ativo, atualizado_em: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  async excluir(id: string): Promise<void> {
    const { error } = await supabase
      .from('responsaveis_comerciais')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
