import { supabase } from './client'

// ─── Tipos ────────────────────────────────────────────────────

export interface CategoriaCatalogo {
  categoria: string
  total: number
}

export interface SubcategoriaCatalogo {
  subcategoria: string
  total: number
}

export interface ItemCatalogo {
  descricao: string
  unidade: string
  total_fornecedores: number
  menor_custo: number
  maior_custo: number
  ultima_atualizacao: string | null
}

export interface FornecedorDoItem {
  id: string
  fornecedor: string | null
  custo_atual: number
  data_ultimo_preco: string | null
  dias_sem_atualizar: number | null
  fornecedor_abc: 'A' | 'B' | 'C' | null
  observacao: string | null
}

export interface ClassificacaoABC {
  nome: string
  classificacao: 'A' | 'B' | 'C'
  criterio?: string | null
  observacao?: string | null
}

// ─── Repository ───────────────────────────────────────────────

export const catalogoRepository = {
  /**
   * Lista todas as categorias com quantidade de itens.
   * Usa a view `catalogo_categorias` criada no migration 10-catalogo.sql.
   */
  async listarCategorias(): Promise<CategoriaCatalogo[]> {
    const { data, error } = await supabase
      .from('catalogo_categorias')
      .select('categoria, total')
      .order('categoria', { ascending: true })
    if (error) throw error
    return (data ?? []) as CategoriaCatalogo[]
  },

  /**
   * Lista subcategorias dentro de uma categoria específica.
   * Usa a view `catalogo_subcategorias`.
   */
  async listarSubcategorias(categoria: string): Promise<SubcategoriaCatalogo[]> {
    const { data, error } = await supabase
      .from('catalogo_subcategorias')
      .select('subcategoria, total')
      .eq('categoria', categoria)
      .order('subcategoria', { ascending: true })
    if (error) throw error
    return (data ?? []) as SubcategoriaCatalogo[]
  },

  /**
   * Lista itens únicos (agrupados por descrição) dentro de categoria+subcategoria.
   * Usa a RPC function `catalogo_itens`.
   */
  async listarItens(categoria: string, subcategoria: string): Promise<ItemCatalogo[]> {
    const { data, error } = await supabase.rpc('catalogo_itens', {
      p_categoria: categoria,
      p_subcategoria: subcategoria,
    })
    if (error) throw error
    return (data ?? []).map((row: {
      descricao: string
      unidade: string
      total_fornecedores: number | string
      menor_custo: number | string
      maior_custo: number | string
      ultima_atualizacao: string | null
    }) => ({
      descricao: row.descricao,
      unidade: row.unidade,
      total_fornecedores: Number(row.total_fornecedores),
      menor_custo: Number(row.menor_custo ?? 0),
      maior_custo: Number(row.maior_custo ?? 0),
      ultima_atualizacao: row.ultima_atualizacao,
    })) as ItemCatalogo[]
  },

  /**
   * Lista todos os fornecedores que vendem um item (por descrição exata).
   * Ordenados por custo_atual ASC (melhor preço primeiro).
   */
  async listarFornecedoresDoItem(descricao: string): Promise<FornecedorDoItem[]> {
    const { data, error } = await supabase
      .from('insumos_view')
      .select(
        'id, fornecedor, custo_atual, data_ultimo_preco, dias_sem_atualizar, fornecedor_abc, observacao'
      )
      .eq('descricao', descricao)
      .eq('ativo', true)
      .order('custo_atual', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row) => ({
      id: row.id as string,
      fornecedor: row.fornecedor as string | null,
      custo_atual: Number(row.custo_atual ?? 0),
      data_ultimo_preco: row.data_ultimo_preco as string | null,
      dias_sem_atualizar: row.dias_sem_atualizar as number | null,
      fornecedor_abc: row.fornecedor_abc as 'A' | 'B' | 'C' | null,
      observacao: row.observacao as string | null,
    }))
  },

  /**
   * Salva/atualiza a classificação ABC de um fornecedor.
   * Upsert por nome do fornecedor (chave primária).
   */
  async salvarClassificacaoABC(
    nome: string,
    classificacao: 'A' | 'B' | 'C',
    criterio?: string
  ): Promise<void> {
    const { error } = await supabase.from('fornecedores_abc').upsert(
      {
        nome,
        classificacao,
        criterio: criterio ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'nome' }
    )
    if (error) throw error
  },

  /**
   * Busca a classificação ABC de todos os fornecedores cadastrados.
   */
  async listarClassificacoesABC(): Promise<ClassificacaoABC[]> {
    const { data, error } = await supabase
      .from('fornecedores_abc')
      .select('nome, classificacao, criterio, observacao')
      .order('nome', { ascending: true })
    if (error) throw error
    return (data ?? []) as ClassificacaoABC[]
  },
}
