import { supabase, sanitizeFilterValue } from './client'

export interface ClienteSupabase {
  id: string
  nome: string
  tipo: string | null
  cnpj_cpf: string | null
  nome_fantasia: string | null
  nome_interno: string | null
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
    const safe = sanitizeFilterValue(termo)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`nome.ilike.%${safe}%,cnpj_cpf.ilike.%${safe}%,nome_fantasia.ilike.%${safe}%,nome_interno.ilike.%${safe}%`)
      .eq('ativo', true)
      .order('nome')

    if (error) throw error
    return data || []
  },

  async buscarPorDocumento(documento: string): Promise<ClienteSupabase | null> {
    const limpo = documento.replace(/\D/g, '')
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`cnpj_cpf.eq.${limpo},cnpj_cpf.eq.${documento}`)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }
}

export interface DadosCNPJ {
  razaoSocial: string
  nomeFantasia: string
  cidade: string
  uf: string
  endereco: string
  bairro: string
  cep: string
  telefone: string
}

export async function buscarDadosCNPJ(cnpj: string): Promise<DadosCNPJ | null> {
  const limpo = cnpj.replace(/\D/g, '')
  if (limpo.length !== 14) return null
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`)
    if (!res.ok) return null
    const d = await res.json()
    return {
      razaoSocial: d.razao_social ?? '',
      nomeFantasia: d.nome_fantasia ?? '',
      cidade: d.municipio ?? '',
      uf: d.uf ?? '',
      endereco: [d.logradouro, d.numero].filter(Boolean).join(', '),
      bairro: d.bairro ?? '',
      cep: (d.cep ?? '').replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
      telefone: d.ddd_telefone_1
        ? `(${d.ddd_telefone_1.trim().slice(0, 2)}) ${d.ddd_telefone_1.trim().slice(2)}`
        : '',
    }
  } catch {
    return null
  }
}
