import type { Categoria, TipoCategoria } from '../../domain/entities/Categoria'
import type { Disciplina } from '../../domain/entities/Disciplina'
import type { Regiao } from '../../domain/entities/Regiao'
import type { TipoObra } from '../../domain/entities/TipoObra'
import type { TipoUnidade, Unidade } from '../../domain/entities/Unidade'
import { supabase } from './client'

interface TipoObraRow {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
}

interface DisciplinaRow {
  id: string
  codigo: string
  nome: string
  especialidade: string
  ativa: boolean
}

interface UnidadeRow {
  id: string
  simbolo: string
  descricao: string
  tipo: TipoUnidade
}

interface RegiaoRow {
  id: string
  nome: string
  uf: string
  municipios: string[] | null
}

interface CategoriaRow {
  id: string
  nome: string
  descricao: string | null
  tipo: TipoCategoria
}

export const cadastrosMestresRepository = {
  async listarTiposObra(): Promise<TipoObra[]> {
    const { data, error } = await supabase
      .from('tipos_obra')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error

    return (data as TipoObraRow[] | null || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || undefined,
      ativo: item.ativo,
    }))
  },

  async criarTipoObra(input: Omit<TipoObra, 'id'>): Promise<TipoObra> {
    const { data, error } = await supabase
      .from('tipos_obra')
      .insert({
        nome: input.nome,
        descricao: input.descricao || null,
        ativo: input.ativo,
      })
      .select('*')
      .single()

    if (error) throw error

    const item = data as TipoObraRow
    return {
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || undefined,
      ativo: item.ativo,
    }
  },

  async atualizarTipoObraAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase
      .from('tipos_obra')
      .update({ ativo, atualizado_em: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  async excluirTipoObra(id: string): Promise<void> {
    const { error } = await supabase
      .from('tipos_obra')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async listarDisciplinas(): Promise<Disciplina[]> {
    const { data, error } = await supabase
      .from('disciplinas')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error

    return (data as DisciplinaRow[] | null || []).map((item) => ({
      id: item.id,
      codigo: item.codigo,
      nome: item.nome,
      especialidade: item.especialidade,
      ativa: item.ativa,
    }))
  },

  async criarDisciplina(input: Omit<Disciplina, 'id'>): Promise<Disciplina> {
    const { data, error } = await supabase
      .from('disciplinas')
      .insert({
        codigo: input.codigo,
        nome: input.nome,
        especialidade: input.especialidade,
        ativa: input.ativa,
      })
      .select('*')
      .single()

    if (error) throw error

    const item = data as DisciplinaRow
    return {
      id: item.id,
      codigo: item.codigo,
      nome: item.nome,
      especialidade: item.especialidade,
      ativa: item.ativa,
    }
  },

  async atualizarDisciplinaAtiva(id: string, ativa: boolean): Promise<void> {
    const { error } = await supabase
      .from('disciplinas')
      .update({ ativa, atualizado_em: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  async excluirDisciplina(id: string): Promise<void> {
    const { error } = await supabase
      .from('disciplinas')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async listarUnidades(): Promise<Unidade[]> {
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('simbolo', { ascending: true })

    if (error) throw error

    return (data as UnidadeRow[] | null || []).map((item) => ({
      id: item.id,
      simbolo: item.simbolo,
      descricao: item.descricao,
      tipo: item.tipo,
    }))
  },

  async criarUnidade(input: Omit<Unidade, 'id'>): Promise<Unidade> {
    const { data, error } = await supabase
      .from('unidades')
      .insert({
        simbolo: input.simbolo,
        descricao: input.descricao,
        tipo: input.tipo,
      })
      .select('*')
      .single()

    if (error) throw error

    const item = data as UnidadeRow
    return {
      id: item.id,
      simbolo: item.simbolo,
      descricao: item.descricao,
      tipo: item.tipo,
    }
  },

  async excluirUnidade(id: string): Promise<void> {
    const { error } = await supabase
      .from('unidades')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async listarRegioes(): Promise<Regiao[]> {
    const { data, error } = await supabase
      .from('regioes')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error

    return (data as RegiaoRow[] | null || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      uf: item.uf,
      municipios: item.municipios || [],
    }))
  },

  async criarRegiao(input: Omit<Regiao, 'id'>): Promise<Regiao> {
    const { data, error } = await supabase
      .from('regioes')
      .insert({
        nome: input.nome,
        uf: input.uf,
        municipios: input.municipios || [],
      })
      .select('*')
      .single()

    if (error) throw error

    const item = data as RegiaoRow
    return {
      id: item.id,
      nome: item.nome,
      uf: item.uf,
      municipios: item.municipios || [],
    }
  },

  async excluirRegiao(id: string): Promise<void> {
    const { error } = await supabase
      .from('regioes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async listarCategorias(): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nome', { ascending: true })

    if (error) throw error

    return (data as CategoriaRow[] | null || []).map((item) => ({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || undefined,
      tipo: item.tipo,
    }))
  },

  async criarCategoria(input: Omit<Categoria, 'id'>): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .insert({
        nome: input.nome,
        descricao: input.descricao || null,
        tipo: input.tipo,
      })
      .select('*')
      .single()

    if (error) throw error

    const item = data as CategoriaRow
    return {
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || undefined,
      tipo: item.tipo,
    }
  },

  async excluirCategoria(id: string): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
