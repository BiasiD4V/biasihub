import { supabase } from './client'

export interface PropostaSupabase {
  id: string
  numero_composto: string
  data_entrada: string | null
  cliente: string | null
  obra: string | null
  objeto: string | null
  disciplina: string | null
  responsavel: string | null
  valor_orcado: number | null
  valor_material: number | null
  valor_mo: number | null
  status: string | null
  tipo: string | null
  data_limite: string | null
  ano: number | null
  created_at: string
}

export interface FiltrosPropostas {
  busca?: string
  ano?: number | null
  status?: string | null
  disciplina?: string | null
  responsavel?: string | null
}

export const propostasRepository = {
  async listarTodas(
    pagina: number = 0,
    filtros: FiltrosPropostas = {}
  ): Promise<{ data: PropostaSupabase[]; total: number }> {
    const POR_PAGINA = 50
    let query = supabase
      .from('propostas')
      .select('*', { count: 'exact' })
      .order('data_entrada', { ascending: false })
      .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

    if (filtros.busca) {
      query = query.or(
        `cliente.ilike.%${filtros.busca}%,objeto.ilike.%${filtros.busca}%,numero_composto.ilike.%${filtros.busca}%,obra.ilike.%${filtros.busca}%`
      )
    }
    if (filtros.ano) query = query.eq('ano', filtros.ano)
    if (filtros.status) query = query.eq('status', filtros.status)
    if (filtros.disciplina) query = query.eq('disciplina', filtros.disciplina)
    if (filtros.responsavel) query = query.eq('responsavel', filtros.responsavel)

    const { data, error, count } = await query
    if (error) throw error
    return { data: data || [], total: count || 0 }
  },

  async buscarKPIs(): Promise<{
    total: number
    fechadas: number
    valorTotal: number
    porAno: { ano: number; total: number; fechadas: number; valor: number }[]
  }> {
    const { data, error } = await supabase
      .from('propostas')
      .select('status, valor_orcado, ano')

    if (error) throw error
    const rows = data || []

    const total = rows.length
    const fechadas = rows.filter((r) => r.status === 'FECHADO').length
    const valorTotal = rows.reduce((acc, r) => acc + (r.valor_orcado || 0), 0)

    const anosMap: Record<number, { total: number; fechadas: number; valor: number }> = {}
    for (const r of rows) {
      if (!r.ano) continue
      if (!anosMap[r.ano]) anosMap[r.ano] = { total: 0, fechadas: 0, valor: 0 }
      anosMap[r.ano].total++
      if (r.status === 'FECHADO') anosMap[r.ano].fechadas++
      anosMap[r.ano].valor += r.valor_orcado || 0
    }

    const porAno = Object.entries(anosMap)
      .map(([ano, v]) => ({ ano: Number(ano), ...v }))
      .sort((a, b) => a.ano - b.ano)

    return { total, fechadas, valorTotal, porAno }
  },

  async listarStatus(): Promise<string[]> {
    const { data, error } = await supabase
      .from('propostas')
      .select('status')
    if (error) throw error
    const unique = [...new Set((data || []).map((r) => r.status).filter(Boolean))] as string[]
    return unique.sort()
  },

  async listarDisciplinas(): Promise<string[]> {
    const { data, error } = await supabase
      .from('propostas')
      .select('disciplina')
    if (error) throw error
    const unique = [...new Set((data || []).map((r) => r.disciplina).filter(Boolean))] as string[]
    return unique.sort()
  },

  async listarResponsaveis(): Promise<string[]> {
    const { data, error } = await supabase
      .from('propostas')
      .select('responsavel')
    if (error) throw error
    const unique = [...new Set((data || []).map((r) => r.responsavel).filter(Boolean))] as string[]
    return unique.sort()
  },
}
