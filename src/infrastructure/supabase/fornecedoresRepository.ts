import { supabase, sanitizeFilterValue } from './client'

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
      .or(`nome.ilike.%${sanitizeFilterValue(termo)}%,cnpj.ilike.%${sanitizeFilterValue(termo)}%`)
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

  async buscarPorDocumento(documento: string): Promise<FornecedorSupabase | null> {
    const limpo = documento.replace(/\D/g, '')
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .or(`cnpj.eq.${limpo},cnpj.eq.${documento}`)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }
}
