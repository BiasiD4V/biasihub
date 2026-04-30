import { supabase, sanitizeFilterValue } from './client'
import type { Pendencia } from '../../domain/entities/Pendencia'

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
  fit_tecnico: string | null
  clareza_documentos: string | null
  valor_estrategico: string | null
  cliente_estrategico: string | null
  prazo_resposta: string | null
  responsavel_comercial?: string | null
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
  status: string
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

type PendenciaRowFlex = {
  id?: string
  proposta_id?: string | null
  orcamento_id?: string | null
  titulo?: string | null
  descricao?: string | null
  status?: string | null
  resolvida?: boolean | null
  prazo?: string | null
  responsavel?: string | null
  criado_por?: string | null
  created_at?: string | null
  criado_em?: string | null
  resolvido_em?: string | null
  atualizado_em?: string | null
}

interface ResumoOperacionalProposta {
  followUps: number
  mudancasEtapa: number
  pendenciasAbertas: number
}

function criarResumoOperacional(): ResumoOperacionalProposta {
  return { followUps: 0, mudancasEtapa: 0, pendenciasAbertas: 0 }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function normalizarStatusPendencia(status?: string | null, resolvida?: boolean | null): Pendencia['status'] {
  const s = (status || '').toLowerCase()
  if (s === 'resolvida' || s === 'resolved' || s === 'concluida' || s === 'concluída') return 'resolvida'
  if (s === 'cancelada' || s === 'cancelado' || s === 'canceled' || s === 'cancelled') return 'cancelada'
  if (typeof resolvida === 'boolean') return resolvida ? 'resolvida' : 'aberta'
  return 'aberta'
}

function rowParaPendencia(r: PendenciaRowFlex): Pendencia {
  const prazoRaw = (r.prazo || '').toString()
  const prazo = prazoRaw.includes('T') ? prazoRaw.slice(0, 10) : prazoRaw
  return {
    id: String(r.id || `pend-${Date.now()}`),
    orcamentoId: String(r.proposta_id || r.orcamento_id || ''),
    descricao: String(r.descricao || r.titulo || ''),
    status: normalizarStatusPendencia(r.status, r.resolvida),
    responsavel: String(r.responsavel || r.criado_por || 'Usuário'),
    prazo,
    criadaEm: String(r.created_at || r.criado_em || new Date().toISOString()),
  }
}

function extrairAnoProposta(row: Pick<PropostaSupabase, 'numero_composto' | 'data_entrada' | 'ano'>): number | null {
  const fromNumero = (row.numero_composto || '').match(/(20\d{2})/)
  if (fromNumero) return Number(fromNumero[1])

  if (row.data_entrada) {
    const fromData = Number(row.data_entrada.slice(0, 4))
    if (!Number.isNaN(fromData) && fromData >= 2000) return fromData
  }

  if (typeof row.ano === 'number' && !Number.isNaN(row.ano)) return row.ano
  return null
}

export const propostasRepository = {
  async listarTodas(
    pagina: number = 0,
    filtros: FiltrosPropostas = {}
  ): Promise<{ data: PropostaSupabase[]; total: number }> {
    const POR_PAGINA = 50
    const inicio = pagina * POR_PAGINA
    const fim = (pagina + 1) * POR_PAGINA - 1

    let query = supabase
      .from('propostas')
      .select('*', { count: 'exact' })
      .order('data_entrada', { ascending: false })

    const usarFiltroAnoNoCliente = typeof filtros.ano === 'number'
    if (!usarFiltroAnoNoCliente) {
      query = query.range(inicio, fim)
    }

    if (filtros.busca) {
      const b = sanitizeFilterValue(filtros.busca)
      query = query.or(
        `cliente.ilike.%${b}%,objeto.ilike.%${b}%,numero_composto.ilike.%${b}%,obra.ilike.%${b}%`
      )
    }
    if (filtros.status) query = query.eq('status', filtros.status)
    if (filtros.disciplina) query = query.eq('disciplina', filtros.disciplina)
    if (filtros.responsavel) query = query.eq('responsavel', filtros.responsavel)

    const { data, error, count } = await query
    if (error) throw error

    if (!usarFiltroAnoNoCliente) {
      return { data: data || [], total: count || 0 }
    }

    const ano = filtros.ano as number
    const todos = (data || []) as PropostaSupabase[]
    const filtradosAno = todos.filter((row) => extrairAnoProposta(row) === ano)
    return {
      data: filtradosAno.slice(inicio, fim + 1),
      total: filtradosAno.length,
    }
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
    const cadastrosResult = await supabase
      .from('disciplinas')
      .select('nome,ativa')
      .eq('ativa', true)

    if (!cadastrosResult.error) {
      const fromCadastros = (cadastrosResult.data || [])
        .map((r: any) => r.nome as string | null)
        .filter(Boolean) as string[]

      if (fromCadastros.length > 0) {
        return [...new Set(fromCadastros)].sort()
      }
    }

    // Fallback para base histórica enquanto o cadastro mestre estiver vazio
    const { data, error } = await supabase
      .from('propostas')
      .select('disciplina')

    if (error) throw error
    return ([...new Set((data || []).map((r) => r.disciplina).filter(Boolean))] as string[]).sort()
  },

  async listarResponsaveis(): Promise<string[]> {
    const cadastrosResult = await supabase
      .from('responsaveis_comerciais')
      .select('nome,ativo')
      .eq('ativo', true)

    if (!cadastrosResult.error) {
      const fromCadastros = (cadastrosResult.data || [])
        .map((r: any) => r.nome as string | null)
        .filter(Boolean) as string[]

      if (fromCadastros.length > 0) {
        return [...new Set(fromCadastros)].sort()
      }
    }

    // Fallback para base histórica enquanto o cadastro mestre estiver vazio
    const { data, error } = await supabase
      .from('propostas')
      .select('responsavel')

    if (error) throw error
    return ([...new Set((data || []).map((r) => r.responsavel).filter(Boolean))] as string[]).sort()
  },

  async listarClientes(): Promise<string[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('nome_interno, nome, ativo')
      .eq('ativo', true)
      .order('nome')

    if (!error && data && data.length > 0) {
      return data
        .map((r: any) => (r.nome_interno || r.nome) as string | null)
        .filter(Boolean) as string[]
    }

    // Fallback histórico se tabela clientes estiver vazia
    const { data: hist } = await supabase.from('propostas').select('cliente')
    return ([...new Set((hist || []).map((r) => r.cliente).filter(Boolean))] as string[]).sort()
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

  async criar(dados: {
    obra: string;
    cliente: string;
    tipo: string | null;
    disciplina: string | null;
    data_entrada: string;
    data_limite: string;
    responsavel: string;
    responsavel_comercial?: string | null;
  }): Promise<PropostaSupabase> {
    // Sempre deriva o ano da data_entrada para evitar bug na virada do ano
    const ano = dados.data_entrada
      ? new Date(dados.data_entrada).getFullYear()
      : new Date().getFullYear();

    // Conta propostas do ano para gerar número sequencial
    const { count } = await supabase
      .from('propostas')
      .select('*', { count: 'exact', head: true })
      .gte('data_entrada', `${ano}-01-01`)
    const seq = (count ?? 0) + 1;
    const numero_composto = `ORC-${ano}-${String(seq).padStart(3, '0')}`;

    const { data, error } = await supabase
      .from('propostas')
      .insert({
        numero_composto,
        obra: dados.obra,
        cliente: dados.cliente,
        tipo: dados.tipo,
        disciplina: dados.disciplina,
        data_entrada: dados.data_entrada,
        data_limite: dados.data_limite,
        responsavel: dados.responsavel,
        responsavel_comercial: dados.responsavel_comercial ?? null,
        status: 'EM_ABERTO',
        ano,
        etapa_funil: 'entrada_oportunidade',
        resultado_comercial: 'em_andamento',
      })
      .select()
      .single()
    if (error) throw error
    return data
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

  /** Busca TODOS os registros com apenas os campos necessários para calcular o score histórico.
   *  Sem paginação — retorna até 2000 rows. Usado para montar o mapa H por cliente. */
  async buscarTodosParaHistorico(): Promise<{ cliente: string; status: string | null; valor_orcado: number | null; disciplina: string | null; data_entrada: string | null }[]> {
    const { data, error } = await supabase
      .from('propostas')
      .select('cliente,status,valor_orcado,disciplina,data_entrada')
      .limit(2000)
    if (error) { console.error('buscarTodosParaHistorico:', error); return [] }
    return (data || []) as any
  },

  async buscarTodosParaClientes(): Promise<Pick<PropostaSupabase, 'id' | 'numero_composto' | 'cliente' | 'obra' | 'objeto' | 'disciplina' | 'valor_orcado' | 'status' | 'resultado_comercial' | 'data_entrada' | 'ano' | 'responsavel' | 'responsavel_comercial' | 'etapa_funil' | 'chance_fechamento' | 'urgencia' | 'proxima_acao' | 'data_proxima_acao' | 'ultima_interacao' | 'link_arquivo' | 'data_limite' | 'observacao_comercial'>[]> {
    const { data, error } = await supabase
      .from('propostas')
      .select('id,numero_composto,cliente,obra,objeto,disciplina,valor_orcado,status,resultado_comercial,data_entrada,ano,responsavel,responsavel_comercial,etapa_funil,chance_fechamento,urgencia,proxima_acao,data_proxima_acao,ultima_interacao,link_arquivo,data_limite,observacao_comercial')
      .limit(5000)
    if (error) { console.error('buscarTodosParaClientes:', error); return [] }
    return (data || []) as any
  },

  async buscarResumoOperacionalParaClientes(propostaIds: string[]): Promise<Record<string, ResumoOperacionalProposta>> {
    const idsUnicos = [...new Set(propostaIds.filter(Boolean))]
    const resumo: Record<string, ResumoOperacionalProposta> = Object.fromEntries(
      idsUnicos.map((id) => [id, criarResumoOperacional()])
    )
    if (!idsUnicos.length) return resumo

    for (const ids of chunkArray(idsUnicos, 300)) {
      const followUps = await supabase
        .from('follow_ups')
        .select('proposta_id,tipo')
        .in('proposta_id', ids)
        .neq('tipo', 'workspace_orcamento_v1')

      if (!followUps.error) {
        for (const row of followUps.data || []) {
          const propostaId = String((row as { proposta_id?: string | null }).proposta_id || '')
          if (resumo[propostaId]) resumo[propostaId].followUps += 1
        }
      }

      const mudancas = await supabase
        .from('mudancas_etapa')
        .select('proposta_id')
        .in('proposta_id', ids)

      if (!mudancas.error) {
        for (const row of mudancas.data || []) {
          const propostaId = String((row as { proposta_id?: string | null }).proposta_id || '')
          if (resumo[propostaId]) resumo[propostaId].mudancasEtapa += 1
        }
      }

      const pendenciasVistas = new Set<string>()
      const consultasPendencias = [
        () => supabase.from('pendencias').select('*').in('orcamento_id', ids),
        () => supabase.from('pendencias').select('*').in('proposta_id', ids),
      ]

      for (const consultar of consultasPendencias) {
        const { data, error } = await consultar()
        if (error) continue

        for (const row of (data || []) as PendenciaRowFlex[]) {
          const pendenciaId = String(row.id || '')
          if (pendenciaId && pendenciasVistas.has(pendenciaId)) continue
          if (pendenciaId) pendenciasVistas.add(pendenciaId)

          const propostaId = String(row.proposta_id || row.orcamento_id || '')
          if (!resumo[propostaId]) continue
          const status = normalizarStatusPendencia(row.status, row.resolvida)
          if (status === 'aberta') resumo[propostaId].pendenciasAbertas += 1
        }
      }
    }

    return resumo
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

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('propostas')
      .delete()
      .eq('id', id)
    if (error) throw error
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
      // Registro tecnico usado como fallback do workspace dinamico.
      // Ele salva no Supabase, mas nao deve aparecer como follow-up comum.
      .neq('tipo', 'workspace_orcamento_v1')
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

  // === Pendencias (compativel com schema novo e legado) ===

  async listarPendencias(orcamentoId: string): Promise<Pendencia[]> {
    const tentativas: Array<() => any> = [
      () => supabase.from('pendencias').select('*').eq('orcamento_id', orcamentoId).order('criado_em', { ascending: false }),
      () => supabase.from('pendencias').select('*').eq('orcamento_id', orcamentoId).order('created_at', { ascending: false }),
      () => supabase.from('pendencias').select('*').eq('proposta_id', orcamentoId).order('criado_em', { ascending: false }),
      () => supabase.from('pendencias').select('*').eq('proposta_id', orcamentoId).order('created_at', { ascending: false }),
      () => supabase.from('pendencias').select('*').eq('orcamento_id', orcamentoId),
      () => supabase.from('pendencias').select('*').eq('proposta_id', orcamentoId),
    ]

    for (const tentar of tentativas) {
      const { data, error } = await tentar()
      if (!error) return ((data || []) as PendenciaRowFlex[]).map(rowParaPendencia)
    }

    console.error('listarPendencias: nao foi possivel consultar pendencias com o schema atual')
    return []
  },

  async inserirPendencia(
    pendencia: Pick<Pendencia, 'orcamentoId' | 'descricao' | 'status' | 'responsavel' | 'prazo'>
  ): Promise<Pendencia | null> {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('pendencias')
      .insert({
        orcamento_id: pendencia.orcamentoId,
        titulo: pendencia.descricao,
        descricao: pendencia.descricao,
        responsavel: pendencia.responsavel || '',
        prazo: pendencia.prazo || null,
        resolvida: pendencia.status === 'resolvida',
        criado_em: agora,
      })
      .select('*')
      .single()

    if (error) {
      console.error('inserirPendencia error:', error)
      return null
    }
    return rowParaPendencia(data as PendenciaRowFlex)
  },

  async resolverPendencia(pendenciaId: string): Promise<boolean> {
    const agora = new Date().toISOString()
    const tentativas = [
      { resolvida: true, status: 'resolvida', resolvido_em: agora, atualizado_em: agora },
      { resolvida: true, status: 'resolvida', atualizado_em: agora },
      { resolvida: true, atualizado_em: agora },
      { status: 'resolvida', resolvido_em: agora, atualizado_em: agora },
      { status: 'resolvida', atualizado_em: agora },
      { resolvida: true },
      { status: 'resolvida' },
    ]

    for (const payload of tentativas) {
      const { error } = await supabase
        .from('pendencias')
        .update(payload)
        .eq('id', pendenciaId)

      if (!error) return true
    }

    console.error('resolverPendencia: nao foi possivel atualizar pendencia com o schema atual')
    return false
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
  async listarTodasMudancasPendentes(): Promise<(MudancaEtapaRow & { proposta: PropostaSupabase })[]> {
    const { data, error } = await supabase
      .from('mudancas_etapa')
      .select('*, proposta:propostas(*)')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
    
    if (error) { console.error('listarTodasMudancasPendentes:', error); return [] }
    return (data || []) as (MudancaEtapaRow & { proposta: PropostaSupabase })[]
  },
}

