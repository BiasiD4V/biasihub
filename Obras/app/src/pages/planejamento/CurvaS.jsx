// ============================================================================
// pages/planejamento/CurvaS.jsx
// Curva S com região "banana" (cenário cedo × tarde), linha hoje, filtro CC
// SPEC-PLN-002-2026 — Etapa 10
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useObra } from '../../context/ObraContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import { calcVP } from '../../lib/planejamento/calcEVM'
import { semanaRef, formatarSemana } from '../../lib/planejamento/diasUteis'
import { AlertTriangle, TrendingUp, Calendar, Filter } from 'lucide-react'

// ─── Cores Biasi ─────────────────────────────────────────────────────────────
const COR_PREVISTO  = '#233772'   // azul escuro — linha planejada
const COR_REALIZADO = '#16a34a'   // verde — linha realizado
const COR_CEDO      = '#93c5fd'   // azul claro — limite superior banana
const COR_TARDE     = '#fca5a5'   // vermelho claro — limite inferior banana
const COR_HOJE      = '#FFC82D'   // amarelo Biasi

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Gera sequência de semanas (segundas-feiras) entre duas datas */
function gerarSemanas(dataInicio, dataFim) {
  const semanas = []
  let atual = new Date(semanaRef(dataInicio) + 'T12:00:00')
  const fim  = new Date(dataFim + 'T12:00:00')
  while (atual <= fim) {
    semanas.push(atual.toISOString().split('T')[0])
    atual.setDate(atual.getDate() + 7)
  }
  return semanas
}

/** Formata semana curta: "14/abr" */
function semCurta(dataStr) {
  const d = new Date(dataStr + 'T12:00:00')
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${String(d.getDate()).padStart(2,'0')}/${meses[d.getMonth()]}`
}

/**
 * Calcula curva S com região banana para um conjunto de atividades.
 * Cenário CEDO:  todas as atividades começam o mais cedo possível (data_inicio_prevista)
 * Cenário TARDE: todas começam o mais tarde possível (data_inicio_prevista + folga_total dias)
 */
function calcularCurvas(atividades, semanas) {
  if (!atividades.length || !semanas.length) return []

  return semanas.map(semana => {
    const dataRef = new Date(semana + 'T12:00:00')

    // VP planejado (normal — sem deslocar)
    const vpPrevisto = calcVP(atividades, dataRef)

    // Curva cedo: atividades com data_inicio = data_inicio_prevista (já é o normal)
    const vpCedo = vpPrevisto

    // Curva tarde: desloca cada atividade pela sua folga_total
    const atividadesTarde = atividades.map(a => {
      const folga = Number(a.folga_total || 0)
      if (!a.data_inicio_prevista || !a.data_fim_prevista) return a
      const ini = new Date(a.data_inicio_prevista + 'T12:00:00')
      const fim = new Date(a.data_fim_prevista   + 'T12:00:00')
      ini.setDate(ini.getDate() + folga)
      fim.setDate(fim.getDate() + folga)
      return {
        ...a,
        data_inicio_prevista: ini.toISOString().split('T')[0],
        data_fim_prevista:    fim.toISOString().split('T')[0],
      }
    })
    const vpTarde = calcVP(atividadesTarde, dataRef)

    return {
      semana,
      label: semCurta(semana),
      previsto:  +vpPrevisto.toFixed(2),
      cedo:      +vpCedo.toFixed(2),
      tarde:     +vpTarde.toFixed(2),
      realizado: null, // preenchido a seguir
    }
  })
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────
function TooltipCurvaS({ active, payload }) {
  if (!active || !payload?.length) return null
  const semana = payload[0]?.payload?.semana
  const nomes = {
    tarde:     'Limite Tarde',
    cedo:      'Limite Cedo',
    previsto:  'Planejado',
    realizado: 'Realizado',
  }
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-2">{semana ? formatarSemana(semana) : ''}</p>
      {payload.map((entry, i) => (
        entry.value !== null && entry.value !== undefined && (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600">{nomes[entry.dataKey] || entry.name}:</span>
            <span className="font-medium">{Number(entry.value).toFixed(1)}%</span>
          </div>
        )
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CurvaS() {
  const { obraSelecionadaId, planejamentoId: planejamentoIdCtx } = useObra()
  const perm = usePermissoes()

  const [planejamentos,   setPlanejamentos]   = useState([])
  const [planejamentoId,  setPlanejamentoId]  = useState(null)
  const [atividades,      setAtividades]      = useState([])
  const [avancos,         setAvancos]         = useState([])
  const [celulas,         setCelulas]         = useState([])
  const [ccFiltro,        setCcFiltro]        = useState('todos')
  const [loading,         setLoading]         = useState(true)
  const [erro,            setErro]            = useState(null)

  const hojeRef = semanaRef(new Date())

  // ── Carregar lista de versões (para dropdown) ──────────────────────────────
  useEffect(() => {
    if (!obraSelecionadaId) { setLoading(false); return }
    setLoading(true)
    setErro(null)

    supabase
      .from('obra_planejamentos')
      .select('id, versao, status, data_base_assinada')
      .eq('obra_id', obraSelecionadaId)
      .order('versao', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setErro(error.message); setLoading(false); return }
        setPlanejamentos(data || [])
        // Usa o ID já resolvido pelo contexto; fallback para o primeiro da lista
        setPlanejamentoId(planejamentoIdCtx || data?.[0]?.id || null)
        if (!planejamentoIdCtx && !data?.[0]) setLoading(false)
      })
  }, [obraSelecionadaId, planejamentoIdCtx])

  // ── Carregar atividades quando planejamento muda ───────────────────────────
  useEffect(() => {
    if (!planejamentoId) return

    const carregar = async () => {
      setLoading(true)
      setErro(null)
      try {
        // Células construtivas para filtro
        const { data: eapData } = await supabase
          .from('planejamento_eap')
          .select('id, codigo, nome, tipo')
          .eq('planejamento_id', planejamentoId)
          .eq('tipo', 'CC')
          .order('ordem')
        setCelulas(eapData || [])

        // Atividades com hierarquia EAP para identificar CC pai
        const { data: atvsData, error: atvsErr } = await supabase
          .from('planejamento_atividades')
          .select(`
            id, nome, duracao_dias,
            data_inicio_prevista, data_fim_prevista,
            peso_percentual, folga_total, is_critica,
            eap_item_id
          `)
          .eq('planejamento_id', planejamentoId)

        if (atvsErr) throw atvsErr

        // Também buscar EAP completo para mapear hierarquia
        const { data: eapAll } = await supabase
          .from('planejamento_eap')
          .select('id, tipo, parent_id, planejamento_id')
          .eq('planejamento_id', planejamentoId)

        // Construir mapa eap_id → cc_id
        const eapMapa = {}
        for (const e of (eapAll || [])) eapMapa[e.id] = e

        const getCCid = (eapItemId) => {
          let cur = eapMapa[eapItemId]
          for (let i = 0; i < 5 && cur; i++) {
            if (cur.tipo === 'CC') return cur.id
            cur = eapMapa[cur.parent_id]
          }
          return null
        }

        const atvsComCC = (atvsData || []).map(a => ({
          ...a,
          cc_id: getCCid(a.eap_item_id),
        }))

        setAtividades(atvsComCC)

        // Avanços físicos
        if (atvsComCC.length > 0) {
          const { data: avancosData } = await supabase
            .from('avancos_fisicos')
            .select('atividade_id, semana_ref, perc_realizado')
            .in('atividade_id', atvsComCC.map(a => a.id))
            .order('semana_ref')
          setAvancos(avancosData || [])
        } else {
          setAvancos([])
        }
      } catch (e) {
        setErro(e.message)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [planejamentoId])

  // ── Atividades filtradas por CC ─────────────────────────────────────────────
  const atividadesFiltradas = useMemo(() => {
    if (ccFiltro === 'todos') return atividades
    return atividades.filter(a => a.cc_id === ccFiltro)
  }, [atividades, ccFiltro])

  // ── Semanas do projeto ──────────────────────────────────────────────────────
  const semanas = useMemo(() => {
    const datas = atividadesFiltradas.flatMap(a => [
      a.data_inicio_prevista, a.data_fim_prevista
    ]).filter(Boolean)
    if (!datas.length) return []
    const ini = datas.reduce((m, d) => d < m ? d : m)
    const fim = datas.reduce((m, d) => d > m ? d : m)
    return gerarSemanas(ini, fim)
  }, [atividadesFiltradas])

  // ── Construir dados do gráfico ──────────────────────────────────────────────
  const dadosGrafico = useMemo(() => {
    if (!semanas.length) return []

    const curvas = calcularCurvas(atividadesFiltradas, semanas)

    // Mapear avanços por atividade
    const avancosPorAtividade = {}
    for (const av of avancos) {
      if (!avancosPorAtividade[av.atividade_id]) avancosPorAtividade[av.atividade_id] = []
      avancosPorAtividade[av.atividade_id].push(av)
    }
    for (const id in avancosPorAtividade) {
      avancosPorAtividade[id].sort((a, b) => (a.semana_ref || '').localeCompare(b.semana_ref || ''))
    }

    return curvas.map(ponto => {
      let va = 0
      for (const atv of atividadesFiltradas) {
        const peso = Number(atv.peso_percentual || 0)
        const avList = avancosPorAtividade[atv.id] || []
        const ultAv  = avList.filter(av => (av.semana_ref || '') <= ponto.semana).slice(-1)[0]
        if (ultAv) va += peso * (Number(ultAv.perc_realizado || 0) / 100)
      }

      return {
        ...ponto,
        realizado: ponto.semana <= hojeRef
          ? +Math.min(100, va).toFixed(2)
          : null,
      }
    })
  }, [atividadesFiltradas, semanas, avancos, hojeRef])

  // ── Desvio atual ────────────────────────────────────────────────────────────
  const desvioAtual = useMemo(() => {
    const pontos = dadosGrafico.filter(d => d.semana <= hojeRef && d.realizado !== null)
    if (!pontos.length) return null
    const p = pontos[pontos.length - 1]
    return { previsto: p.previsto, realizado: p.realizado, desvio: p.realizado - p.previsto }
  }, [dadosGrafico, hojeRef])

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (!obraSelecionadaId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <TrendingUp size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Selecione uma obra no cabeçalho</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Curva S — Progresso Físico</h1>
          <p className="text-sm text-slate-500 mt-1">
            Comparativo planejado × realizado com região banana (cedo/tarde)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {planejamentos.length > 1 && (
            <select
              value={planejamentoId || ''}
              onChange={e => setPlanejamentoId(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {planejamentos.map(p => (
                <option key={p.id} value={p.id}>
                  V.{String(p.versao).padStart(2,'0')} — {p.status}
                  {p.data_base_assinada ? ` · ${new Date(p.data_base_assinada).toLocaleDateString('pt-BR')}` : ''}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={ccFiltro}
              onChange={e => setCcFiltro(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todas as Células</option>
              {celulas.map(cc => (
                <option key={cc.id} value={cc.id}>
                  {cc.codigo} — {cc.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertTriangle size={18} />
          <span className="text-sm">{erro}</span>
        </div>
      )}

      {/* KPIs */}
      {!loading && desvioAtual && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Previsto hoje</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{desvioAtual.previsto.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Realizado</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{desvioAtual.realizado.toFixed(1)}%</p>
          </div>
          <div className={`rounded-xl border p-4 ${desvioAtual.desvio >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Desvio</p>
            <p className={`text-2xl font-bold mt-1 ${desvioAtual.desvio >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {desvioAtual.desvio > 0 ? '+' : ''}{desvioAtual.desvio.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
            <span className={`inline-flex items-center mt-1 px-2 py-1 rounded-full text-xs font-semibold border ${
              desvioAtual.desvio >= 0
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              {desvioAtual.desvio >= 0
                ? `+${desvioAtual.desvio.toFixed(1)}% adiantado`
                : `${desvioAtual.desvio.toFixed(1)}% de atraso`}
            </span>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-blue-700" />
          <h2 className="font-semibold text-slate-800">Avanço Físico Acumulado (%)</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
          </div>
        ) : dadosGrafico.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <Calendar size={40} className="mx-auto mb-2 opacity-30" />
              <p>Nenhuma atividade com datas cadastradas</p>
              <p className="text-sm mt-1">Configure o cronograma na aba Cronograma</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={dadosGrafico} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                tickFormatter={v => `${v}%`}
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                width={45}
              />
              <Tooltip content={<TooltipCurvaS />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
                formatter={(value) => ({
                  tarde:     'Limite Tarde (banana)',
                  cedo:      'Limite Cedo (banana)',
                  previsto:  'Planejado (baseline)',
                  realizado: 'Realizado',
                }[value] || value)}
              />

              {/* Região banana — tarde primeiro (fundo), depois cedo (sobrepõe com branco) */}
              <Area
                type="monotone"
                dataKey="tarde"
                stroke={COR_TARDE}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill={COR_TARDE}
                fillOpacity={0.2}
                dot={false}
                legendType="line"
              />
              <Area
                type="monotone"
                dataKey="cedo"
                stroke={COR_CEDO}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill="white"
                fillOpacity={1}
                dot={false}
                legendType="line"
              />

              {/* Linha planejada */}
              <Line
                type="monotone"
                dataKey="previsto"
                stroke={COR_PREVISTO}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />

              {/* Linha realizada */}
              <Line
                type="monotone"
                dataKey="realizado"
                stroke={COR_REALIZADO}
                strokeWidth={2.5}
                dot={{ fill: COR_REALIZADO, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />

              {/* Linha HOJE */}
              {semanas.includes(hojeRef) && (
                <ReferenceLine
                  x={semCurta(hojeRef)}
                  stroke={COR_HOJE}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{
                    value: 'Hoje',
                    position: 'top',
                    fill: COR_HOJE,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legenda interpretativa */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Como interpretar a Curva S</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <div className="w-8 h-0 mt-2 flex-shrink-0 border-t-2" style={{ borderColor: COR_PREVISTO }} />
            <span><strong>Azul escuro (Planejado):</strong> progresso esperado pela baseline assinada.</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-8 h-0 mt-2 flex-shrink-0 border-t-2" style={{ borderColor: COR_REALIZADO }} />
            <span><strong>Verde (Realizado):</strong> avanço físico registrado semanalmente.</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-8 h-2 mt-1 flex-shrink-0 rounded" style={{ backgroundColor: COR_CEDO, opacity: 0.6 }} />
            <span><strong>Limite Cedo (azul claro):</strong> se todas as atividades iniciassem no prazo.</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-8 h-2 mt-1 flex-shrink-0 rounded" style={{ backgroundColor: COR_TARDE, opacity: 0.6 }} />
            <span><strong>Limite Tarde (vermelho claro):</strong> se todas as atividades usassem toda a folga disponível.</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Linha realizada dentro da região banana = execução dentro da tolerância. Abaixo da linha tarde = atraso crítico.
        </p>
      </div>

    </div>
  )
}
