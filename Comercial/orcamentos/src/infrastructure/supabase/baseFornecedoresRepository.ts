import { supabase } from './client'

export interface BaseFornecedor {
  id: string
  disciplina: string
  generico: string
  especifico: string
  unidade: string
  cls: 'A' | 'B' | 'C'
  rank: number
  fornecedor: string
  ultimo_valor: string
  variacao: string
  menor_valor: string
  tempo_relacionamento: string
  qtd_compras: string
  qtd_total: string
  fabricante: string
  homologacao: string
  suporte: string
  ocorrencias: string
  email: string
  telefone: string
  contato: string
  ultimo_pedido: string
  ultima_obra: string
  criado_em: string
  atualizado_em: string
}

export type BaseFornecedorInput = Omit<BaseFornecedor, 'id' | 'criado_em' | 'atualizado_em'>

export const baseFornecedoresRepository = {
  async listarTodos(): Promise<BaseFornecedor[]> {
    const pageSize = 1000
    const rows: BaseFornecedor[] = []

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('base_fornecedores')
        .select('*')
        .order('disciplina')
        .order('generico')
        .order('especifico')
        .order('cls')
        .order('rank')
        .range(from, from + pageSize - 1)

      if (error) throw error
      rows.push(...(data || []))
      if (!data || data.length < pageSize) break
    }

    return rows
  },

  async criar(row: BaseFornecedorInput): Promise<BaseFornecedor> {
    const { data, error } = await supabase
      .from('base_fornecedores')
      .insert(row)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(id: string, row: Partial<BaseFornecedorInput>): Promise<BaseFornecedor> {
    const { data, error } = await supabase
      .from('base_fornecedores')
      .update({ ...row, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async excluir(id: string): Promise<void> {
    const { error } = await supabase
      .from('base_fornecedores')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async excluirPorEspecifico(especifico: string, unidade: string): Promise<void> {
    const { error } = await supabase
      .from('base_fornecedores')
      .delete()
      .eq('especifico', especifico)
      .eq('unidade', unidade)
    if (error) throw error
  },

  async excluirPorGenerico(generico: string): Promise<void> {
    const { error } = await supabase
      .from('base_fornecedores')
      .delete()
      .eq('generico', generico)
    if (error) throw error
  },

  async excluirPorDisciplina(disciplina: string): Promise<void> {
    const { error } = await supabase
      .from('base_fornecedores')
      .delete()
      .eq('disciplina', disciplina)
    if (error) throw error
  },
}
