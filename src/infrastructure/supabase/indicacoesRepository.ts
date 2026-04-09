import { supabase } from './client'

export interface IndicacaoSupabase {
  id: string
  created_at: string
  data: string
  indicador_nome: string
  indicador_tipo: string
  cliente_indicado: string
  canal: string | null
  status: string
  proposta_id: string | null
  valor_potencial: number | null
  observacao: string | null
  responsavel: string | null
  data_retorno: string | null
  resultado: string | null
}

export type CriarIndicacaoInput = Omit<IndicacaoSupabase, 'id' | 'created_at'>

export const STATUS_INDICACAO: Record<string, { label: string; cor: string; bg: string }> = {
  ouro:             { label: 'Master / Top',       cor: 'text-yellow-700', bg: 'bg-yellow-100'  },
  recomendado:      { label: 'Recomendado',        cor: 'text-green-700',  bg: 'bg-green-100'   },
  ativo:            { label: 'Ativo / Padrão',     cor: 'text-blue-700',   bg: 'bg-blue-100'    },
  em_avaliacao:     { label: 'Em avaliação',       cor: 'text-amber-700',  bg: 'bg-amber-100'   },
  bloqueado:        { label: 'Não indicar',        cor: 'text-red-700',    bg: 'bg-red-100'     },
  inativo:          { label: 'Inativo',            cor: 'text-slate-500',  bg: 'bg-slate-100'   },
}

export const TIPO_INDICADOR = ['Prestador', 'Loja', 'Colaborador', 'Agência', 'Outro']
export const CANAIS_INDICACAO = ['Sede Biasi', 'Obra', 'WhatsApp', 'LinkedIn', 'Evento', 'Outro']

export const indicacoesRepository = {
  async listarTodas(filtros?: { status?: string | null; responsavel?: string | null; busca?: string }): Promise<IndicacaoSupabase[]> {
    let query = supabase
      .from('indicacoes')
      .select('*')
      .order('data', { ascending: false })

    if (filtros?.status) query = query.eq('status', filtros.status)
    if (filtros?.responsavel) query = query.eq('responsavel', filtros.responsavel)
    if (filtros?.busca) {
      const b = filtros.busca.replace(/'/g, "''")
      query = query.or(`indicador_nome.ilike.%${b}%,cliente_indicado.ilike.%${b}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async criar(dados: CriarIndicacaoInput): Promise<IndicacaoSupabase> {
    const { data, error } = await supabase
      .from('indicacoes')
      .insert(dados)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(id: string, dados: Partial<CriarIndicacaoInput>): Promise<IndicacaoSupabase> {
    const { data, error } = await supabase
      .from('indicacoes')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('indicacoes')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
