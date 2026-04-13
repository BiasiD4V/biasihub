import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, BarChart2, ChevronRight, RefreshCw,
  Clock, Flame, Activity, ArrowLeft, Grid2x2, Maximize2
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import { useObra } from '../../context/ObraContext'

// ── Formatadores ────────────────────────────────────────────────────────────

function fmtPct(v) {
  if (v === null || v === undefined) return '—'
  return `${Number(v).toFixed(1)}%`
}

function fmtMoeda(v) {
  const n = Number(v || 0)
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(0)}k`
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

// ── Cálculos ─────────────────────────────────────────────────────────────────

/**
 * Calcula físico realizado e previsto para um conjunto de itens EAP (tipo S).
 * Items devem ter: peso_percentual, peso_realizado_agregado,
 *   data_inicio_prevista/baseline, data_fim_prevista/baseline
 */
function calcFisico(servicos) {
  const hoje = new Date().toISOString().slice(0, 10)

  const totalPeso = servicos.reduce((s, i) => s + (Number(i.peso_percentual) || 0), 0)
  if (!totalPeso) return { real: 0, previsto: 0 }

  // Realizado
  const somaReal = servicos.reduce((s, i) =>
    s + (Number(i.peso_percentual) || 0) * (Number(i.peso_realizado_agregado) || 0) / 100
  , 0)
  const real = Math.round(somaReal / totalPeso * 1000) / 10

  // Previsto
  let somaPrev = 0
  for (const s of servicos) {
    const peso    = Number(s.peso_percentual) || 0
    const ini_str = s.data_inicio_prevista || s.data_inicio_baseline
    const fim_str = s.data_fim_prevista    || s.data_fim_baseline
    if (!ini_str || !fim_str) continue

    let fracao = 0
    if (hoje >= fim_str) {
      fracao = 1
    } else if (hoje >= ini_str) {
      const ini     = new Date(ini_str + 'T12:00:00')
      const fim     = new Date(fim_str + 'T12:00:00')
      const cur     = new Date(hoje    + 'T12:00:00')
      const duracao = Math.max(1, (fim - ini) / 86_400_000)
      fracao = Math.min(1, (cur - ini) / 86_400_000 / duracao)
    }
    somaPrev += peso * fracao
  }
  const previsto = Math.round(somaPrev / totalPeso * 1000) / 10

  return { real, previsto }
}

/**
 * Gera pontos mensais para a Curva S de uma lista de serviços.
 * Retorna array de { mes, previsto, realizado } para recharts.
 */
function gerarCurvaS(servicos) {
  if (!servicos.length) return []

  // Determina período global
  let minDate = null, maxDate = null
  for (const s of servicos) {
    const ini = s.data_inicio_prevista || s.data_inicio_baseline
    const fim = s.data_fim_prevista    || s.data_fim_baseline
    if (ini && (!minDate || ini < minDate)) minDate = ini
    if (fim && (!maxDate || fim > maxDate)) maxDate = fim
  }
  if (!minDate || !maxDate) return []

  const totalPeso = servicos.reduce((s, i) => s + (Number(i.peso_percentual) || 0), 0)
  if (!totalPeso) return []

  // Meses entre min e max + 1 mês depois
  const pontos = []
  const dataIni = new Date(minDate + 'T12:00:00')
  const dataFim = new Date(maxDate + 'T12:00:00')
  // Avança ao 1º do mês
  let cur = new Date(dataIni.getFullYear(), dataIni.getMonth(), 1)
  const limMax = new Date(dataFim.getFullYear(), dataFim.getMonth() + 2, 1)

  while (cur <= limMax) {
    const isoDate = cur.toISOString().slice(0, 10)

    // Previsto acumulado nesta data
    let somaPrev = 0
    for (const s of servicos) {
      const peso    = Number(s.peso_percentual) || 0
      const ini_str = s.data_inicio_prevista || s.data_inicio_baseline
      const fim_str = s.data_fim_prevista    || s.data_fim_baseline
      if (!ini_str || !fim_str) continue
      if (isoDate >= fim_str) {
        somaPrev += peso
      } else if (isoDate >= ini_str) {
        const ini     = new Date(ini_str + 'T12:00:00')
        const fim     = new Date(fim_str + 'T12:00:00')
        const c       = new Date(isoDate  + 'T12:00:00')
        const dur     = Math.max(1, (fim - ini) / 86_400_000)
        somaPrev += peso * Math.min(1, (c - ini) / 86_400_000 / dur)
      }
    }

    pontos.push({
      mes: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      previsto: Math.round(somaPrev / totalPeso * 1000) / 10,
    })

    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }

  return pontos
}

// ── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, cor, bgCor, trend }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bgCor || '#EEF2FF' }}>
          <Icon size={18} style={{ color: cor || '#233772' }} />
        </div>
        {TrendIcon && <TrendIcon size={14} style={{ color: trend === 'up' ? '#16a34a' : '#dc2626' }} />}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: cor || '#233772' }}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Card por Obra ────────────────────────────────────────────────────────────

function CardObra({ plano, servicos, onClick }) {
  const { real, previsto } = useMemo(() => calcFisico(servicos), [servicos])
  const delta   = real - previsto
  const atrasadas = servicos.filter(s => s.status_execucao === 'atrasada').length
  const criticas  = servicos.filter(s => s.is_critica).length
  const concluidos = servicos.filter(s => s.status_execucao === 'concluida').length

  function corBarra(pct) {
    if (pct >= 80) return '#16a34a'
    if (pct >= 40) return '#2563eb'
    return '#233772'
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow group">

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide truncate">
            {plano.obra?.codigo || '—'}
          </p>
          <p className="text-sm font-semibold text-slate-800 truncate mt-0.5 group-hover:text-[#233772]">
            {plano.obra?.nome || plano.nome || '—'}
          </p>
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-[#233772] flex-shrink-0 mt-1" />
      </div>

      {/* Barra progresso */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-medium mb-1">
          <span className="text-slate-500">Físico realizado</span>
          <span style={{ color: delta >= 0 ? '#16a34a' : '#dc2626' }}>
            {fmtPct(real)}
            {previsto > 0 && (
              <span className="ml-1 opacity-70">
                ({delta >= 0 ? '+' : ''}{fmtPct(delta)} vs prev.)
              </span>
            )}
          </span>
        </div>
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
          {/* Barra previsto */}
          <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300"
            style={{ width: `${Math.min(100, previsto)}%` }} />
          {/* Barra realizado */}
          <div className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${Math.min(100, real)}%`, backgroundColor: corBarra(real) }} />
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
          {concluidos}/{servicos.length} serv.
        </span>
        {atrasadas > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {atrasadas} atras.
          </span>
        )}
        {criticas > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
            {criticas} crít.
          </span>
        )}
      </div>
    </div>
  )
}

// ── Painel atrasadas ──────────────────────────────────────────────────────────

function PainelAtrasadas({ lista }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Serviços Atrasados</span>
        {lista.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{lista.length}</span>
        )}
      </div>
      {lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-slate-400">
          <CheckCircle2 size={24} className="mb-2 text-green-400" />
          <p className="text-xs">Nenhum atraso detectado</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {lista.map((s, i) => (
            <div key={s.id || i} className="px-4 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{s.nome}</p>
                  {s.nomeObra && <p className="text-[11px] text-slate-400 truncate">{s.nomeObra}</p>}
                </div>
                {s.is_critica && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex-shrink-0">CRÍTICA</span>
                )}
              </div>
              {(s.data_fim_prevista || s.data_fim_baseline) && (
                <p className="text-[11px] text-red-500 mt-0.5">
                  Prazo: {fmtData(s.data_fim_prevista || s.data_fim_baseline)}
                  {s.folga_total != null && s.folga_total <= 5 && (
                    <span className="ml-1 text-orange-500">FT={s.folga_total}d</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Painel reprogramações ────────────────────────────────────────────────────

function PainelReprogramacoes({ lista }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Reprogramações Pendentes</span>
        {lista.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{lista.length}</span>
        )}
      </div>
      {lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-36 text-slate-400">
          <CheckCircle2 size={24} className="mb-2 text-green-400" />
          <p className="text-xs">Nenhuma pendente de aprovação</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {lista.map((r, i) => (
            <div key={r.id || i} className="px-4 py-2.5">
              <p className="text-xs font-semibold text-slate-700 truncate">
                {r.atividade?.nome || '—'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{r.motivo || 'Sem motivo informado'}</p>
              {r.data_inicio_nova && (
                <p className="text-[11px] text-amber-600 mt-0.5">Nova data: {fmtData(r.data_inicio_nova)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Curva S ───────────────────────────────────────────────────────────────────

function CurvaSChart({ pontos }) {
  if (!pontos.length) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
      Sem dados suficientes para gerar a Curva S
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={pontos} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#233772" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#233772" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="mes" tick={{ fontSize: 9, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
        <ReTooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Area type="monotone" dataKey="previsto" name="Previsto"
          stroke="#94a3b8" strokeWidth={1.5} fill="url(#gradPrev)" dot={false} />
        {pontos.some(p => p.realizado != null) && (
          <Area type="monotone" dataKey="realizado" name="Realizado"
            stroke="#233772" strokeWidth={2} fill="url(#gradReal)" dot={false} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function DashboardPlanejamento() {
  const { usuario, podeVerObra } = useAuth()
  const perm = usePermissoes()
  const navigate = useNavigate()
  const { setObraSelecionada } = useObra()

  const [obraFiltro,        setObraFiltro]        = useState(null)
  const [planosAcessiveis,  setPlanosAcessiveis]  = useState([])
  const [servicosPorPlano,  setServicosPorPlano]  = useState({})  // { [planejamentoId]: [...] }
  const [atrasadas,         setAtrasadas]         = useState([])
  const [reprogramacoes,    setReprogramacoes]    = useState([])
  const [carregando,        setCarregando]        = useState(true)
  const [viewMode,          setViewMode]          = useState("grid")  // "grid" | "todas"
  const [previousFilter,    setPreviousFilter]    = useState(null)    // Guarda filtro anterior
  const [expandedResumos,   setExpandedResumos]   = useState({})      // { [obraId]: boolean }

  // ── Carregar ──────────────────────────────────────────────────────────────

  async function carregar() {
    setCarregando(true)
    try {
      // 1. Planejamentos ativos
      const { data: planejamentos } = await supabase
        .from('obra_planejamentos')
        .select('id, obra_id, versao, status, nome, obra:obras(id, nome, codigo, status)')
        .in('status', ['rascunho', 'em_revisao', 'aprovado'])
        .order('versao', { ascending: false })

      // Pega apenas o plano mais recente por obra
      const porObra = {}
      for (const p of (planejamentos || [])) {
        if (!porObra[p.obra_id] && (!podeVerObra || podeVerObra(p.obra_id))) {
          porObra[p.obra_id] = p
        }
      }
      const planos = Object.values(porObra)
      setPlanosAcessiveis(planos)

      if (!planos.length) {
        setCarregando(false)
        return
      }

      const planosIds = planos.map(p => p.id)

      // 2. EAP tipo S com atividades embutidas
      const { data: eapItens } = await supabase
        .from('planejamento_eap')
        .select(`
          id, codigo, nome, tipo, nivel, parent_id, peso_percentual, valor_orcado,
          planejamento_id,
          atividade:planejamento_atividades(
            id, status, is_critica, folga_total, peso_realizado_perc,
            data_inicio_prevista, data_fim_prevista,
            data_inicio_baseline, data_fim_baseline
          )
        `)
        .in('planejamento_id', planosIds)
        .eq('tipo', 'S')
        .is('deletado_em', null)

      // Normaliza em mapa planejamentoId → [...serviços]
      const mapa = {}
      for (const item of (eapItens || [])) {
        const atv = Array.isArray(item.atividade) ? item.atividade[0] : item.atividade
        const normalizado = {
          ...item,
          ...(atv || {}),
          // peso_realizado_agregado pode vir como peso_realizado_perc na atividade
          peso_realizado_agregado: atv?.peso_realizado_perc ?? 0,
          status_execucao: atv?.status ?? 'nao_iniciada',
          data_inicio_prevista:  atv?.data_inicio_prevista,
          data_fim_prevista:     atv?.data_fim_prevista,
          data_inicio_baseline:  atv?.data_inicio_baseline,
          data_fim_baseline:     atv?.data_fim_baseline,
        }
        if (!mapa[item.planejamento_id]) mapa[item.planejamento_id] = []
        mapa[item.planejamento_id].push(normalizado)
      }
      setServicosPorPlano(mapa)

      // 3. Atrasadas (todos os planos)
      const todasAtrasadas = []
      for (const plano of planos) {
        const servs = mapa[plano.id] || []
        const atrasadasPlano = servs
          .filter(s => s.status_execucao === 'atrasada')
          .map(s => ({ ...s, nomeObra: plano.obra?.nome || plano.nome }))
        todasAtrasadas.push(...atrasadasPlano)
      }
      // Ordena: críticas primeiro
      todasAtrasadas.sort((a, b) => (b.is_critica ? 1 : 0) - (a.is_critica ? 1 : 0))
      setAtrasadas(todasAtrasadas)

      // 4. Reprogramações pendentes
      if (perm.aprovarReprogramacao) {
        try {
          const { data: reps } = await supabase
            .from('reprogramacoes')
            .select('id, motivo, data_inicio_nova, created_at, planejamento_id, atividade:planejamento_atividades(nome)')
            .in('planejamento_id', planosIds)
            .eq('status', 'pendente')
            .order('created_at', { ascending: false })
            .limit(15)
          setReprogramacoes(reps || [])
        } catch (_) {}
      }
    } catch (err) {
      console.error('[DashboardPlanejamento]', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  // ── Derivados ─────────────────────────────────────────────────────────────

  const planosFiltrados = useMemo(() => {
    if (!obraFiltro) return planosAcessiveis
    return planosAcessiveis.filter(p => p.obra_id === obraFiltro)
  }, [obraFiltro, planosAcessiveis])

  // KPIs globais
  const kpis = useMemo(() => {
    let totalServicos = 0, totalConcluidos = 0, totalAtrasadas = 0, totalCriticas = 0
    let somaReal = 0, obrasComDados = 0

    for (const plano of planosFiltrados) {
      const servs = servicosPorPlano[plano.id] || []
      if (!servs.length) continue
      const { real } = calcFisico(servs)
      somaReal += real
      obrasComDados++
      totalServicos  += servs.length
      totalConcluidos += servs.filter(s => s.status_execucao === 'concluida').length
      totalAtrasadas  += servs.filter(s => s.status_execucao === 'atrasada').length
      totalCriticas   += servs.filter(s => s.is_critica).length
    }

    return {
      obras:       planosFiltrados.length,
      fisicoMedio: obrasComDados ? Math.round(somaReal / obrasComDados * 10) / 10 : 0,
      atrasadas:   totalAtrasadas,
      criticas:    totalCriticas,
      servicos:    totalServicos,
      concluidos:  totalConcluidos,
    }
  }, [planosFiltrados, servicosPorPlano])

  // Curva S — apenas quando filtro de obra ativo
  const curvaS = useMemo(() => {
    const servs = obraFiltro
      ? (servicosPorPlano[planosFiltrados[0]?.id] || [])
      : []
    return gerarCurvaS(servs)
  }, [obraFiltro, planosFiltrados, servicosPorPlano])

  // Atrasadas filtradas
  const atrasadasFiltradas = useMemo(() => {
    if (!obraFiltro) return atrasadas
    const ids = new Set(planosFiltrados.map(p => p.id))
    return atrasadas.filter(s => ids.has(s.planejamento_id))
  }, [obraFiltro, atrasadas, planosFiltrados])

  // ── Tela vazia ────────────────────────────────────────────────────────────

  if (!carregando && planosAcessiveis.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Building2 size={48} className="mb-4 text-slate-200" />
        <h2 className="text-xl font-bold mb-2" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
          Nenhuma obra acessível
        </h2>
        <p className="text-slate-500 text-center max-w-md text-sm">
          Você não tem acesso a nenhuma obra no momento.<br />
          Solicite ao administrador o acesso a pelo menos uma obra.
        </p>
      </div>
    )
  }

  const obrasOptions = planosAcessiveis.map(p => ({
    value: p.obra_id,
    label: `${p.obra?.codigo || '—'} — ${p.obra?.nome || p.nome || ''}`.trim()
  }))


  // ── Helpers para multi-obra view ────────────────────────────────────────

  function toggleViewMode() {
    if (viewMode === 'grid') {
      setPreviousFilter(obraFiltro)
      setViewMode('todas')
      setObraFiltro(null)
    } else {
      setViewMode('grid')
      setObraFiltro(previousFilter)
    }
  }

  function toggleResumoExpanded(obraId) {
    setExpandedResumos(prev => ({
      ...prev,
      [obraId]: !prev[obraId]
    }))
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
            Dashboard de Planejamento
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {planosFiltrados.length} obra{planosFiltrados.length !== 1 ? 's' : ''} · atualizado agora
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={obraFiltro || ''}
            onChange={e => setObraFiltro(e.target.value || null)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#233772]">
            <option value="">Todas as obras</option>
            {obrasOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={carregar} disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button onClick={toggleViewMode} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors"
            style={{
              borderColor: viewMode === 'todas' ? '#233772' : '#e2e8f0',
              backgroundColor: viewMode === 'todas' ? '#233772' : 'transparent',
              color: viewMode === 'todas' ? '#ffffff' : '#64748b'
            }}>
            {viewMode === 'grid' ? (
              <>
                <Maximize2 size={13} />
                Ver Todas
              </>
            ) : (
              <>
                <ArrowLeft size={13} />
                Voltar
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Building2}
          label="Obras Ativas"
          value={kpis.obras}
          sub={`${kpis.concluidos}/${kpis.servicos} serv. concluídos`}
          cor="#233772"
          bgCor="#EEF2FF"
        />
        <KpiCard
          icon={Activity}
          label="Físico Médio"
          value={fmtPct(kpis.fisicoMedio)}
          sub="Realizado ponderado"
          cor={kpis.fisicoMedio >= 50 ? '#16a34a' : '#233772'}
          bgCor={kpis.fisicoMedio >= 50 ? '#f0fdf4' : '#EEF2FF'}
          trend={kpis.fisicoMedio >= 50 ? 'up' : null}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Atrasados"
          value={kpis.atrasadas}
          sub="Serviços em atraso"
          cor={kpis.atrasadas > 0 ? '#dc2626' : '#16a34a'}
          bgCor={kpis.atrasadas > 0 ? '#fef2f2' : '#f0fdf4'}
          trend={kpis.atrasadas > 0 ? 'down' : null}
        />
        <KpiCard
          icon={Flame}
          label="Críticos"
          value={kpis.criticas}
          sub="No caminho crítico"
          cor={kpis.criticas > 0 ? '#f97316' : '#16a34a'}
          bgCor={kpis.criticas > 0 ? '#fff7ed' : '#f0fdf4'}
        />
      </div>

      {/* ── Resumo por Obra (PCO Style) ── */}
      {viewMode === "todas" && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <button
              onClick={toggleViewMode}
              className="flex items-center gap-1 text-[#233772] hover:underline">
              <ArrowLeft size={12} />
              Retornar à grade
            </button>
            · Resumo de Todas as Obras
          </h2>
          <div className="space-y-4">
            {planosAcessiveis.map(plano => (
              <ResumoDashboardObra
                key={plano.id}
                servicos={servicosPorPlano[plano.id] || []}
                obranome={plano.obra?.nome || plano.nome || "—"}
                codigoObra={plano.obra?.codigo || "—"}
                compact={false}
                aberto={expandedResumos[plano.obra_id] !== false}
                onToggle={() => toggleResumoExpanded(plano.obra_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Grid de obras (modo grid) ── */}
      {viewMode === "grid" && planosFiltrados.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Status por Obra
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {planosFiltrados.map(plano => (
              <CardObra
                key={plano.id}
                plano={plano}
                servicos={servicosPorPlano[plano.id] || []}
                onClick={() => {
                  setObraSelecionada(plano.obra_id)
                  navigate('/planejamento/cronograma')
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Curva S (só quando obra filtrada) ── */}
      {obraFiltro && curvaS.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Curva S — Avanço Físico Previsto
          </h2>
          <CurvaSChart pontos={curvaS} />
        </div>
      )}

      {/* ── Painéis inferiores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PainelAtrasadas lista={atrasadasFiltradas} />
        <PainelReprogramacoes lista={reprogramacoes} />
      </div>

      {/* ── Loading overlay ── */}
      {carregando && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg px-6 py-4">
            <div className="w-5 h-5 border-2 border-[#233772] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-600">Carregando dados...</span>
          </div>
        </div>
      )}
    </div>
  )
}
