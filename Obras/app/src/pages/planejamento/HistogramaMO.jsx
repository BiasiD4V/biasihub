/**
 * HistogramaMO.jsx
 * Histograma de Mão de Obra — visão multi-obra ou por obra individual
 *
 * Metodologia: Aldo Dórea Mattos — "Planejamento e Controle de Obras"
 *   Cap. 12 — Histograma de Recursos: demanda × capacidade, nivelamento,
 *   identificação de picos e otimização da equipe.
 *
 * Fonte de dados: tabela mo_planejamento (registros mensais por cargo/rateio)
 *   Criados e gerenciados em: pages/planejamento/Recursos.jsx
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, LineChart, Line, ComposedChart,
  Area,
} from 'recharts'
import {
  Users, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp,
  RefreshCw, Building2, DollarSign, BarChart2,
} from 'lucide-react'
import { moPlanejamentoService } from '../../lib/supabase'
import {
  FUNCOES_BIASI, RATEIO_CONFIG, calcularCustoPeriodo,
  ENCARGOS_PADRAO, BENEFICIOS_FIXOS_PADRAO,
} from '../../lib/custosMO'
import { useAuth } from '../../context/AuthContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import { supabase } from '../../lib/supabase'

// ── Constantes ────────────────────────────────────────────────────────────────

const RATEIOS = ['ELÉTRICA', 'HIDRÁULICA', 'CIVIL', 'INDIRETA', 'FLEXÍVEL']

const COR_RATEIO = {
  ELÉTRICA:   '#233772',
  HIDRÁULICA: '#0891b2',
  CIVIL:      '#16a34a',
  INDIRETA:   '#d97706',
  FLEXÍVEL:   '#9333ea',
}

const MESES_NOMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ── Formatadores ──────────────────────────────────────────────────────────────

function fmtMoeda(v) {
  const n = Number(v || 0)
  if (n >= 1_000_000) return `R$${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$${(n/1_000).toFixed(0)}k`
  return `R$${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

function fmtNum(v, dec = 1) {
  return Number(v || 0).toFixed(dec)
}

// ── Lógica de negócio (Aldo Dórea) ──────────────────────────────────────────

/**
 * A partir de um registro mo_planejamento, calcula o custo total do período
 * usando calcularCustoPeriodo do custosMO.
 */
function custoRegistro(reg) {
  const cargo = FUNCOES_BIASI.find(f => f.id === reg.cargo_id)
  if (!cargo) return reg.custo_total_snapshot || 0
  try {
    const res = calcularCustoPeriodo(
      cargo,
      reg.quantidade,
      reg.dias_uteis || ENCARGOS_PADRAO.diasUteisMensais,
      reg.step_num || 1,
    )
    return res.totalPeriodo || 0
  } catch {
    return reg.custo_total_snapshot || 0
  }
}

/**
 * Agrupa registros mensais em pontos para o gráfico (escala mensal).
 * Cada ponto: { label, [rateio]: qtd, custo, obras: Set }
 */
function agruparMensal(registros) {
  const mapa = {} // "YYYY-MM" → { ELÉTRICA, HIDRÁULICA, ..., custo, obras }

  for (const reg of registros) {
    const key = `${reg.ano_referencia}-${String(reg.mes_referencia).padStart(2,'0')}`
    if (!mapa[key]) mapa[key] = { ...Object.fromEntries(RATEIOS.map(r => [r, 0])), custo: 0, obras: new Set() }

    const cargo  = FUNCOES_BIASI.find(f => f.id === reg.cargo_id)
    const rateio = cargo?.rateio || 'FLEXÍVEL'
    mapa[key][rateio] = (mapa[key][rateio] || 0) + (reg.quantidade || 0)
    mapa[key].custo  += custoRegistro(reg)
    if (reg.obra_id) mapa[key].obras.add(reg.obra_id)
  }

  return Object.entries(mapa)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => {
      const [ano, mesIdx] = key.split('-')
      const label = `${MESES_NOMES[Number(mesIdx) - 1]}/${ano.slice(2)}`
      const total = RATEIOS.reduce((s, r) => s + (vals[r] || 0), 0)
      return { key, label, total: Math.round(total * 10) / 10, custo: Math.round(vals.custo), obras: vals.obras.size, ...vals }
    })
}

/**
 * Calcula o pico do histograma e semanas acima de uma capacidade informada.
 */
function calcNivelamento(pontos, capacidade) {
  const pico  = pontos.reduce((max, p) => Math.max(max, p.total), 0)
  const acima = pontos.filter(p => p.total > capacidade).length
  const media = pontos.length ? pontos.reduce((s, p) => s + p.total, 0) / pontos.length : 0
  return { pico, acima, media: Math.round(media * 10) / 10 }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function TooltipHistograma({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.filter(p => RATEIOS.includes(p.dataKey)).reduce((s, p) => s + (Number(p.value) || 0), 0)
  const custo = payload.find(p => p.dataKey === 'custo')
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1 min-w-[200px]">
      <p className="font-bold text-slate-800 mb-1.5">{label}</p>
      {payload.filter(p => RATEIOS.includes(p.dataKey) && Number(p.value) > 0).map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.fill }} />
            {RATEIO_CONFIG[p.dataKey]?.label || p.dataKey}
          </span>
          <span className="font-mono font-semibold text-slate-700">{fmtNum(p.value)} HH</span>
        </div>
      ))}
      <div className="pt-1 border-t border-slate-100 flex justify-between font-bold text-slate-700">
        <span>Total</span>
        <span className="font-mono">{fmtNum(total)} HH/dia</span>
      </div>
      {custo && (
        <div className="flex justify-between text-green-700">
          <span>Custo mês</span>
          <span className="font-mono font-semibold">{fmtMoeda(custo.value)}</span>
        </div>
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, cor, bgCor, trend }) {
  const TI = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bgCor || '#EEF2FF' }}>
          <Icon size={18} style={{ color: cor || '#233772' }} />
        </div>
        {TI && <TI size={14} style={{ color: trend === 'up' ? '#16a34a' : '#dc2626' }} />}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-0.5 font-mono" style={{ color: cor || '#233772' }}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Painel de nivelamento ────────────────────────────────────────────────────

function PainelNivelamento({ pontos, capacidade, setCapacidade }) {
  const { pico, acima, media } = calcNivelamento(pontos, capacidade)
  const fatorNivelamento = pico > 0 ? Math.round((media / pico) * 100) : 0

  // Aldo Dórea: fator de nivelamento ideal > 0,75
  const nivelBom = fatorNivelamento >= 75

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          Análise de Nivelamento
        </h3>
        <a href="https://pt.wikipedia.org/wiki/Aldo_D%C3%B3rea_Mattos" target="_blank" rel="noreferrer"
          className="text-[10px] text-slate-300 hover:text-slate-500">
          Metodologia Aldo Dórea
        </a>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Pico</p>
          <p className="text-lg font-bold font-mono" style={{ color: pico > capacidade ? '#dc2626' : '#233772' }}>
            {fmtNum(pico)}
          </p>
          <p className="text-[10px] text-slate-400">HH/dia</p>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Média</p>
          <p className="text-lg font-bold font-mono text-[#233772]">{fmtNum(media)}</p>
          <p className="text-[10px] text-slate-400">HH/dia</p>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Fator niv.</p>
          <p className="text-lg font-bold font-mono" style={{ color: nivelBom ? '#16a34a' : '#dc2626' }}>
            {fmtNum(fatorNivelamento, 0)}%
          </p>
          <p className="text-[10px] text-slate-400">{nivelBom ? '≥ 75% ✓' : '< 75% !'}</p>
        </div>
      </div>

      {/* Capacidade máxima (ajustável) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-500">
            Capacidade máxima (HH/dia)
          </label>
          <span className="font-mono text-xs font-bold" style={{ color: acima > 0 ? '#dc2626' : '#16a34a' }}>
            {capacidade}
          </span>
        </div>
        <input type="range" min="1" max={Math.max(50, Math.ceil(pico * 1.5))}
          value={capacidade}
          onChange={e => setCapacidade(Number(e.target.value))}
          className="w-full accent-[#233772]" />
        {acima > 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
            <AlertTriangle size={11} />
            {acima} período{acima > 1 ? 's' : ''} acima da capacidade — risco de superdimensionamento
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
            <CheckCircle2 size={11} />
            Demanda dentro da capacidade em todos os períodos
          </div>
        )}
      </div>

      {/* Explicação Aldo Dórea */}
      <div className="text-[10px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
        <strong>Fator de nivelamento</strong> = média ÷ pico. Quanto mais próximo de 100%, mais uniforme é a alocação.
        Picos altos indicam contratações temporárias não planejadas. Vales indicam mão de obra ociosa.
      </div>
    </div>
  )
}

// ── Tabela de cargos ─────────────────────────────────────────────────────────

function TabelaCargos({ registros, pontosMensais }) {
  // Agrupa por cargo e soma quantidade × meses
  const porCargo = useMemo(() => {
    const map = {}
    for (const reg of registros) {
      const cargo = FUNCOES_BIASI.find(f => f.id === reg.cargo_id)
      const key   = reg.cargo_id
      if (!map[key]) map[key] = {
        cargoId: key,
        nome:    cargo?.cargo   || reg.cargo?.cargo || '—',
        familia: cargo?.familia || '—',
        rateio:  cargo?.rateio  || '—',
        qtdTotal: 0,
        custoTotal: 0,
        meses: {},
      }
      map[key].qtdTotal  += reg.quantidade || 0
      map[key].custoTotal += custoRegistro(reg)
      const mesKey = `${reg.ano_referencia}-${String(reg.mes_referencia).padStart(2,'0')}`
      map[key].meses[mesKey] = (map[key].meses[mesKey] || 0) + (reg.quantidade || 0)
    }
    return Object.values(map).sort((a, b) => a.rateio.localeCompare(b.rateio) || a.nome.localeCompare(b.nome))
  }, [registros])

  const colunas = pontosMensais.slice(-6) // últimos 6 meses

  if (!porCargo.length) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Equipe Planejada por Cargo</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">Cargo</th>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Rateio</th>
              {colunas.map(c => (
                <th key={c.key} className="px-3 py-2.5 text-center font-semibold text-slate-500 whitespace-nowrap">{c.label}</th>
              ))}
              <th className="px-3 py-2.5 text-right font-semibold text-slate-500 whitespace-nowrap">Custo Total</th>
            </tr>
          </thead>
          <tbody>
            {porCargo.map(c => (
              <tr key={c.cargoId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <p className="font-semibold text-slate-700">{c.nome}</p>
                  <p className="text-slate-400 text-[10px]">{c.familia}</p>
                </td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ backgroundColor: (COR_RATEIO[c.rateio] || '#64748b') + '20', color: COR_RATEIO[c.rateio] || '#64748b' }}>
                    {c.rateio}
                  </span>
                </td>
                {colunas.map(col => (
                  <td key={col.key} className="px-3 py-2 text-center font-mono text-slate-600">
                    {c.meses[col.key] ? fmtNum(c.meses[col.key], 0) : <span className="text-slate-200">—</span>}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-mono font-semibold text-[#233772]">
                  {fmtMoeda(c.custoTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td className="px-4 py-2 text-slate-700" colSpan={2}>Total</td>
              {colunas.map(col => {
                const tot = porCargo.reduce((s, c) => s + (c.meses[col.key] || 0), 0)
                return (
                  <td key={col.key} className="px-3 py-2 text-center font-mono text-[#233772]">
                    {tot ? fmtNum(tot, 0) : '—'}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right font-mono text-[#233772]">
                {fmtMoeda(porCargo.reduce((s, c) => s + c.custoTotal, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function HistogramaMO() {
  const { podeVerObra } = useAuth()
  const perm = usePermissoes()

  const [obras,         setObras]         = useState([])
  const [obraFiltro,    setObraFiltro]    = useState(null)   // null = todas
  const [registros,     setRegistros]     = useState([])
  const [carregando,    setCarregando]    = useState(true)
  const [capacidade,    setCapacidade]    = useState(20)     // HH/dia padrão (ajustável)

  // ── Carregar ──────────────────────────────────────────────────────────────

  async function carregar() {
    setCarregando(true)
    try {
      // 1. Obras acessíveis
      const { data: planejamentos } = await supabase
        .from('obra_planejamentos')
        .select('obra_id, obra:obras(id, nome, codigo)')
        .in('status', ['rascunho', 'em_revisao', 'aprovado'])

      const vistas = {}
      for (const p of (planejamentos || [])) {
        if (!vistas[p.obra_id] && (!podeVerObra || podeVerObra(p.obra_id))) {
          vistas[p.obra_id] = { id: p.obra_id, nome: p.obra?.nome || p.obra_id, codigo: p.obra?.codigo || '' }
        }
      }
      const obrasList = Object.values(vistas)
      setObras(obrasList)

      // 2. Registros mo_planejamento
      let regs = []
      if (obraFiltro) {
        regs = await moPlanejamentoService.listarPorObra(obraFiltro)
      } else {
        // Busca todas as obras acessíveis
        regs = await moPlanejamentoService.listarTodas()
        regs = regs.filter(r => vistas[r.obra_id])
      }
      setRegistros(regs)
    } catch (err) {
      console.error('[HistogramaMO]', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [obraFiltro])

  // ── Derivados ──────────────────────────────────────────────────────────────

  const pontosMensais = useMemo(() => agruparMensal(registros), [registros])

  const kpis = useMemo(() => {
    const pico       = pontosMensais.reduce((max, p) => Math.max(max, p.total), 0)
    const custoTotal = registros.reduce((s, r) => s + custoRegistro(r), 0)
    const cargosSet  = new Set(registros.map(r => r.cargo_id))
    return { pico, custoTotal, cargos: cargosSet.size }
  }, [pontosMensais, registros])

  const rateiosPresentes = useMemo(() =>
    RATEIOS.filter(r => pontosMensais.some(p => (p[r] || 0) > 0))
  , [pontosMensais])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
            Histograma de Mão de Obra
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Demanda × capacidade · nivelamento de equipe
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro de obra */}
          <select
            value={obraFiltro || ''}
            onChange={e => setObraFiltro(e.target.value || null)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#233772]">
            <option value="">Todas as obras</option>
            {obras.map(o => (
              <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} — ` : ''}{o.nome}</option>
            ))}
          </select>
          <button onClick={carregar} disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {carregando && (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">Carregando registros...</span>
        </div>
      )}

      {!carregando && registros.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-600 mb-1">Nenhuma alocação cadastrada</p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Acesse a página <strong>Recursos</strong> para cadastrar a equipe planejada por mês.
            O histograma será gerado automaticamente.
          </p>
        </div>
      )}

      {!carregando && registros.length > 0 && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={Building2}
              label="Obras"
              value={obraFiltro ? '1' : obras.length}
              sub="com alocação cadastrada"
              cor="#233772" bgCor="#EEF2FF"
            />
            <KpiCard
              icon={Users}
              label="Pico de equipe"
              value={`${fmtNum(kpis.pico, 0)} HH`}
              sub="maior demanda mensal"
              cor={kpis.pico > capacidade ? '#dc2626' : '#16a34a'}
              bgCor={kpis.pico > capacidade ? '#fef2f2' : '#f0fdf4'}
              trend={kpis.pico > capacidade ? 'down' : 'up'}
            />
            <KpiCard
              icon={BarChart2}
              label="Cargos distintos"
              value={kpis.cargos}
              sub="na equipe planejada"
              cor="#0891b2" bgCor="#ecfeff"
            />
            <KpiCard
              icon={DollarSign}
              label="Custo total MO"
              value={fmtMoeda(kpis.custoTotal)}
              sub="acumulado do período"
              cor="#233772" bgCor="#EEF2FF"
            />
          </div>

          {/* ── Histograma principal ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-700">
                  Demanda de Mão de Obra por Período
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Quantidade de colaboradores (HH/dia) · empilhado por especialidade
                </p>
              </div>
              {/* Legenda rateios */}
              <div className="flex gap-2 flex-wrap">
                {rateiosPresentes.map(r => (
                  <span key={r} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: COR_RATEIO[r] + '18', color: COR_RATEIO[r] }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: COR_RATEIO[r] }} />
                    {RATEIO_CONFIG[r]?.label || r}
                  </span>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={pontosMensais} margin={{ top: 4, right: 16, left: -8, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis yAxisId="hh" tick={{ fontSize: 9, fill: '#94a3b8' }}
                  label={{ value: 'HH/dia', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#94a3b8', dy: 28 }} />
                <YAxis yAxisId="custo" orientation="right" tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickFormatter={v => fmtMoeda(v)} />
                <Tooltip content={<TooltipHistograma />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />

                {/* Linha de capacidade máxima */}
                <ReferenceLine yAxisId="hh" y={capacidade} stroke="#dc2626" strokeDasharray="5 3"
                  label={{ value: `Cap. ${capacidade} HH`, fontSize: 9, fill: '#dc2626', position: 'right' }} />

                {/* Barras por rateio (empilhadas) */}
                {rateiosPresentes.map(r => (
                  <Bar key={r} yAxisId="hh" dataKey={r} name={RATEIO_CONFIG[r]?.label || r}
                    fill={COR_RATEIO[r]} stackId="hh" maxBarSize={48} />
                ))}

                {/* Curva de custo (linha secundária) */}
                <Line yAxisId="custo" type="monotone" dataKey="custo" name="Custo mês (R$)"
                  stroke="#16a34a" strokeWidth={2} dot={{ r: 3, fill: '#16a34a' }}
                  strokeDasharray="4 2" legendType="plainline" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ── Nivelamento + Tabela ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <PainelNivelamento
                pontos={pontosMensais}
                capacidade={capacidade}
                setCapacidade={setCapacidade}
              />
            </div>
            <div className="lg:col-span-2">
              <TabelaCargos registros={registros} pontosMensais={pontosMensais} />
            </div>
          </div>

          {/* ── Comparativo por obra (quando multi-obra) ── */}
          {!obraFiltro && obras.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-700 mb-1">
                Demanda Total por Obra
              </h2>
              <p className="text-[11px] text-slate-400 mb-4">
                Distribuição percentual da equipe alocada em cada obra
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {obras.map(obra => {
                  const regsObra   = registros.filter(r => r.obra_id === obra.id)
                  const totalObra  = regsObra.reduce((s, r) => s + (r.quantidade || 0), 0)
                  const custoObra  = regsObra.reduce((s, r) => s + custoRegistro(r), 0)
                  const totalGeral = registros.reduce((s, r) => s + (r.quantidade || 0), 0)
                  const pct        = totalGeral > 0 ? Math.round(totalObra / totalGeral * 100) : 0
                  return (
                    <div key={obra.id} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{obra.codigo}</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{obra.nome}</p>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#233772]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="font-mono font-bold text-[#233772]">{fmtNum(totalObra, 0)} HH</span>
                        <span className="text-slate-400">{pct}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">{fmtMoeda(custoObra)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
