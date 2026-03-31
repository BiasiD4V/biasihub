import { supabase } from './client'

export interface FornecedorSupabase {
  id: string
  codigo_erp: string | null
  nome: string
  cnpj: string | null
  ie: string | null
  endereco: string | null
  municipio: string | null
  uf: string | null
  cep: string | null
  telefone: string | null
  tipo: string | null
  avaliacao: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export const fornecedoresRepository = {
  async listarTodos(): Promise<FornecedorSupabase[]> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (error) throw error
    return data || []
  },

  async buscar(termo: string): Promise<FornecedorSupabase[]> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .or(`nome.ilike.%${termo}%,cnpj.ilike.%${termo}%`)
      .eq('ativo', true)
      .order('nome')
      .limit(100)

    if (error) throw error
    return data || []
  },

  async buscarPorId(id: string): Promise<FornecedorSupabase | null> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async criar(fornecedor: Partial<FornecedorSupabase>): Promise<FornecedorSupabase> {
    const { data, error } = await supabase
      .from('fornecedores')
      .insert(fornecedor)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async atualizar(id: string, fornecedor: Partial<FornecedorSupabase>): Promise<FornecedorSupabase> {
    const { data, error } = await supabase
      .from('fornecedores')
      .update({ ...fornecedor, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
