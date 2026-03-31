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
  // Funil / Prioridade
  etapa_funil: string | null
  resultado_comercial: string | null
  chance_fechamento: string | null
  urgencia: string | null
  proxima_acao: string | null
  data_proxima_acao: string | null
  ultima_interacao: string | null
  observacao_comercial: string | null
  link_arquivo: string | null
}

export interface FiltrosPropostas {
  busca?: string
  ano?: number | null
  status?: string | null
  disciplina?: string | null
  responsavel?: string | null
}

export interface MudancaEtapaRow {
  id: string
  proposta_id: string
  etapa_anterior: string | null
  etapa_nova: string
  responsavel: string
  observacao: string | null
  arquivo: string | null
  created_at: string
}

export interface FollowUpRow {
  id: string
  proposta_id: string
  tipo: string
  data: string
  responsavel: string
  resumo: string
  proxima_acao: string | null
  data_proxima_acao: string | null
  arquivo: string | null
  created_at: string
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

  async buscarDadosDashboard(): Promise<{
    total: number
    fechadas: number
    valorTotal: number
    porAno: { ano: number; total: number; fechadas: number; valor: number }[]
    porStatus: { status: string; quantidade: number }[]
    porResponsavel: { responsavel: string; total: number; fechadas: number; valor: number }[]
    porDisciplina: { disciplina: string; total: number; fechadas: number; valor: number }[]
    recentes: PropostaSupabase[]
  }> {
    // Dados agregados
    const { data: all, error: e1 } = await supabase
      .from('propostas')
      .select('status, valor_orcado, ano, responsavel, disciplina')
    if (e1) throw e1
    const rows = all || []

    const total = rows.length
    const fechadas = rows.filter((r) => r.status === 'FECHADO').length
    const valorTotal = rows.reduce((acc, r) => acc + (r.valor_orcado || 0), 0)

    // Por ano
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

    // Por status
    const statusMap: Record<string, number> = {}
    for (const r of rows) {
      const s = r.status || 'SEM STATUS'
      statusMap[s] = (statusMap[s] || 0) + 1
    }
    const porStatus = Object.entries(statusMap)
      .map(([status, quantidade]) => ({ status, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)

    // Por responsável
    const respMap: Record<string, { total: number; fechadas: number; valor: number }> = {}
    for (const r of rows) {
      const resp = r.responsavel || 'Sem responsável'
      if (!respMap[resp]) respMap[resp] = { total: 0, fechadas: 0, valor: 0 }
      respMap[resp].total++
      if (r.status === 'FECHADO') respMap[resp].fechadas++
      respMap[resp].valor += r.valor_orcado || 0
    }
    const porResponsavel = Object.entries(respMap)
      .map(([responsavel, v]) => ({ responsavel, ...v }))
      .sort((a, b) => b.total - a.total)

    // Por disciplina
    const discMap: Record<string, { total: number; fechadas: number; valor: number }> = {}
    for (const r of rows) {
      const d = r.disciplina || 'Sem disciplina'
      if (!discMap[d]) discMap[d] = { total: 0, fechadas: 0, valor: 0 }
      discMap[d].total++
      if (r.status === 'FECHADO') discMap[d].fechadas++
      discMap[d].valor += r.valor_orcado || 0
    }
    const porDisciplina = Object.entries(discMap)
      .map(([disciplina, v]) => ({ disciplina, ...v }))
      .sort((a, b) => b.total - a.total)

    // Recentes
    const { data: recentes, error: e2 } = await supabase
      .from('propostas')
      .select('*')
      .order('data_entrada', { ascending: false })
      .limit(5)
    if (e2) throw e2

    return { total, fechadas, valorTotal, porAno, porStatus, porResponsavel, porDisciplina, recentes: recentes || [] }
  },

  async atualizar(id: string, dados: Partial<Omit<PropostaSupabase, 'id' | 'created_at'>>): Promise<PropostaSupabase> {
    const { data, error } = await supabase
      .from('propostas')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async buscarPorId(id: string): Promise<PropostaSupabase | null> {
    const { data, error } = await supabase
      .from('propostas')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  // === Mudanças de Etapa ===

  async listarMudancasEtapa(propostaId: string): Promise<MudancaEtapaRow[]> {
    const { data, error } = await supabase
      .from('mudancas_etapa')
      .select('*')
      .eq('proposta_id', propostaId)
      .order('created_at', { ascending: false })
    if (error) { console.error('mudancas_etapa:', error); return [] }
    return data || []
  },

  async inserirMudancaEtapa(row: Omit<MudancaEtapaRow, 'id' | 'created_at'>): Promise<MudancaEtapaRow | null> {
    const { data, error } = await supabase
      .from('mudancas_etapa')
      .insert(row)
      .select()
      .single()
    if (error) { console.error('inserirMudancaEtapa:', error); return null }
    return data
  },

  // === Follow-ups ===

  async listarFollowUps(propostaId: string): Promise<FollowUpRow[]> {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('proposta_id', propostaId)
      .order('data', { ascending: false })
    if (error) { console.error('follow_ups:', error); return [] }
    return data || []
  },

  async inserirFollowUp(row: Omit<FollowUpRow, 'id' | 'created_at'>): Promise<FollowUpRow | null> {
    const { data, error } = await supabase
      .from('follow_ups')
      .insert(row)
      .select()
      .single()
    if (error) { console.error('inserirFollowUp:', error); return null }
    return data
  },

  async atualizarFollowUp(id: string, dados: Partial<Omit<FollowUpRow, 'id' | 'created_at'>>): Promise<boolean> {
    const { error } = await supabase
      .from('follow_ups')
      .update(dados)
      .eq('id', id)
    if (error) { console.error('atualizarFollowUp:', error); return false }
    return true
  },

  async deletarFollowUp(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id)
    if (error) { console.error('deletarFollowUp:', error); return false }
    return true
  },

  async atualizarMudancaEtapa(id: string, dados: Partial<Omit<MudancaEtapaRow, 'id' | 'created_at'>>): Promise<boolean> {
    const { error } = await supabase
      .from('mudancas_etapa')
      .update(dados)
      .eq('id', id)
    if (error) { console.error('atualizarMudancaEtapa:', error); return false }
    return true
  },

  async deletarMudancaEtapa(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('mudancas_etapa')
      .delete()
      .eq('id', id)
    if (error) { console.error('deletarMudancaEtapa:', error); return false }
    return true
  },
}
