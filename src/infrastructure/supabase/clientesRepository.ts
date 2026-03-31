import { supabase } from './client'

export interface ClienteSupabase {
  id: string
  nome: string
  tipo: string | null
  cnpj_cpf: string | null
  nome_fantasia: string | null
  tipo_pessoa: string | null
  cidade: string | null
  estado: string | null
  endereco: string | null
  bairro: string | null
  cep: string | null
  ie: string | null
  codigo_erp: string | null
  contato_nome: string | null
  contato_email: string | null
  contato_telefone: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export const clientesRepository = {
  async listarTodos(): Promise<ClienteSupabase[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error
    return data || []
  },

  async buscarPorId(id: string): Promise<ClienteSupabase | null> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async criar(cliente: Partial<ClienteSupabase>): Promise<ClienteSupabase> {
    const { data, error } = await supabase
      .from('clientes')
      .insert(cliente)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async atualizar(id: string, cliente: Partial<ClienteSupabase>): Promise<ClienteSupabase> {
    const { data, error } = await supabase
      .from('clientes')
      .update({ ...cliente, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async buscar(termo: string): Promise<ClienteSupabase[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .ilike('nome', `%${termo}%`)
      .eq('ativo', true)
      .order('nome')

    if (error) throw error
    return data || []
  }
}
