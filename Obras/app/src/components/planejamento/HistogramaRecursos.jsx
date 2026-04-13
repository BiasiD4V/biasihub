import React, { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ChevronDown, ChevronRight, Users, RefreshCw } from 'lucide-react'
import { moPlanejamentoService } from '../../lib/supabase'
import { FUNCOES_BIASI, RATEIO_CONFIG } from '../../lib/custosMO'

// ── Categorias de rateio com cores ────────────────────────────────────────────

const RATEIO_COR = {
  ELÉTRICA:   '#233772',
  HIDRÁULICA: '#0891b2',
  CIVIL:      '#d97706',
  INDIRETA:   '#9333ea',
  FLEXÍVEL:   '#64748b',
}

const RATEIOS_ORDEM = ['ELÉTRICA', 'HIDRÁULICA', 'CIVIL', 'INDIRETA', 'FLEXÍVEL']

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Retorna a segunda-feira da semana que contém a data dada.
 */
function inicioSemana(ano, mes, dia) {
  const d = new Date(ano, mes - 1, dia, 12)
  const dow = d.getDay() // 0=dom
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * Rótulo "dd/mm" da semana.
 */
function labelSemana(isoDate) {
  const d = new Date(isoDate + 'T12:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Retorna os dias úteis de um mês agrupados por semana:
 * { [isoSemana]: qtdDiasUteis }
 */
function diasUteisPorSemana(ano, mes) {
  const result = {}
  const diasNoMes = new Date(ano, mes, 0).getDate()
  for (let d = 1; d <= diasNoMes; d++) {
    const date  = new Date(ano, mes - 1, d, 12)
    const dow   = date.getDay()
    if (dow >= 1 && dow <= 5) {
      const sem = inicioSemana(ano, mes, d)
      result[sem] = (result[sem] || 0) + 1
    }
  }
  return result
}

/**
 * Distribui os trabalhadores de um registro `mo_planejamento` por semana.
 * Retorna mapa { semana: { [rateio]: quantidade_media_por_dia } }
 */
function distribuirMO(registro) {
  const { mes_referencia, ano_referencia, quantidade, dias_uteis } = registro
  if (!quantidade || !mes_referencia || !ano_referencia) return {}

  // Descobre o rateio do cargo
  const cargo = FUNCOES_BIASI.find(f => f.id === registro.cargo_id)
  const rateio = cargo?.rateio || registro.cargo?.rateio || 'FLEXÍVEL'

  // Dias úteis reais do mês (padrão 22 se não informado)
  const diasUteisRef = dias_uteis || 22

  // Distribui por semana proporcional aos dias úteis de cada semana no mês
  const distSem = diasUteisPorSemana(ano_referencia, mes_referencia)
  const result  = {}
  for (const [sem, dSem] of Object.entries(distSem)) {
    // Quantidade proporcional: qtd × (dias nesta semana / dias úteis do mês)
    const qtdSemana = quantidade * (dSem / diasUteisRef)
    if (!result[sem]) result[sem] = {}
    result[sem][rateio] = (result[sem][rateio] || 0) + qtdSemana
  }
  return result
}

/**
 * Agrega todos os registros mo_planejamento em pontos semanais para recharts.
 */
function calcHistograma(registros) {
  const semanas = {} // { [iso]: { ELÉTRICA: n, HIDRÁULICA: n, ... } }

  for (const reg of registros) {
    const dist = distribuirMO(reg)
    for (const [sem, rateios] of Object.entries(dist)) {
      if (!semanas[sem]) semanas[sem] = {}
      for (const [rat, v] of Object.entries(rateios)) {
        semanas[sem][rat] = (semanas[sem][rat] || 0) + v
      }
    }
  }

  return Object.entries(semanas)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sem, vals]) => {
      const ponto = { semana: sem, label: labelSemana(sem) }
      let total = 0
      for (const rat of RATEIOS_ORDEM) {
        const v = Math.round((vals[rat] || 0) * 10) / 10
        ponto[rat] = v
        total += v
      }
      ponto.total = Math.round(total * 10) / 10
      return ponto
    })
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function TooltipHistograma({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0)
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1 min-w-[180px]">
      <p className="font-bold text-slate-700 mb-1.5">Semana de {label}</p>
      {payload.filter(p => p.value > 0).map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-semibold text-slate-700">{Number(p.value).toFixed(1)}</span>
        </div>
      ))}
      <div className="pt-1 border-t border-slate-100 flex justify-between font-bold">
        <span className="text-slate-500">Total</span>
        <span className="font-mono text-slate-800">{total.toFixed(1)}</span>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * HistogramaRecursos
 *
 * Painel colapsável com histograma semanal de Mão de Obra,
 * baseado na tabela mo_planejamento (registros mensais por cargo/rateio).
 *
 * Props:
 *   obraId           - ID da obra selecionada
 *   aberto / onToggle
 */
export default function HistogramaRecursos({ obraId, aberto, onToggle }) {
  const [registros,   setRegistros]   = useState([])
  const [carregando,  setCarregando]  = useState(false)

  useEffect(() => {
    if (!obraId || !aberto) return
    setCarregando(true)
    moPlanejamentoService.listarPorObra(obraId)
      .then(data => setRegistros(data))
      .catch(err => console.error('[HistogramaRecursos]', err))
      .finally(() => setCarregando(false))
  }, [obraId, aberto])

  const dadosSemana = useMemo(() =>
    calcHistograma(registros)
  , [registros])

  const temDados = dadosSemana.length > 0

  // Pico total
  const picoTotal = useMemo(() =>
    dadosSemana.reduce((max, d) => Math.max(max, d.total || 0), 0)
  , [dadosSemana])

  // Rateios presentes
  const rateiosPresentes = useMemo(() =>
    RATEIOS_ORDEM.filter(r => dadosSemana.some(d => (d[r] || 0) > 0))
  , [dadosSemana])

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

      {/* Cabeçalho clicável */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          {aberto ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Histograma de Mão de Obra
          </span>
          {!aberto && temDados && (
            <span className="text-xs text-slate-400 ml-2">
              {dadosSemana.length} semanas · pico {picoTotal.toFixed(1)} HH
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!temDados && !aberto && (
            <span className="text-[10px] text-slate-300">sem dados cadastrados</span>
          )}
        </div>
      </button>

      {/* Corpo */}
      {aberto && (
        <div className="border-t border-slate-100 p-4 space-y-4">

          {carregando && (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-sm">Carregando recursos...</span>
            </div>
          )}

          {!carregando && !temDados && (
            <div className="text-center py-8 text-slate-400">
              <Users size={28} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm font-medium mb-1">Nenhum recurso planejado</p>
              <p className="text-xs max-w-xs mx-auto">
                Cadastre a equipe na página <strong>Recursos</strong> para visualizar
                o histograma semanal de mão de obra.
              </p>
            </div>
          )}

          {!carregando && temDados && (
            <>
              {/* KPIs */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Pico semanal</p>
                  <p className="text-lg font-bold font-mono" style={{ color: '#233772' }}>
                    {picoTotal.toFixed(1)} <span className="text-xs font-normal text-slate-400">HH/dia</span>
                  </p>
                </div>
                {rateiosPresentes.map(r => {
                  const picoR = dadosSemana.reduce((max, d) => Math.max(max, d[r] || 0), 0)
                  return (
                    <div key={r} className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{r}</p>
                      <p className="text-sm font-bold font-mono" style={{ color: RATEIO_COR[r] }}>
                        {picoR.toFixed(1)}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Gráfico empilhado */}
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={dadosSemana}
                  margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                  barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    interval={Math.max(0, Math.floor(dadosSemana.length / 10) - 1)}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    label={{ value: 'HH/dia', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#94a3b8', dy: 25 }}
                  />
                  <Tooltip content={<TooltipHistograma />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />

                  {/* Linha de pico */}
                  {picoTotal > 0 && (
                    <ReferenceLine
                      y={picoTotal}
                      stroke="#dc2626"
                      strokeDasharray="4 2"
                      label={{ value: `Pico: ${picoTotal.toFixed(1)}`, fontSize: 9, fill: '#dc2626', position: 'right' }}
                    />
                  )}

                  {rateiosPresentes.map(r => (
                    <Bar
                      key={r}
                      dataKey={r}
                      name={r}
                      fill={RATEIO_COR[r]}
                      stackId="stack"
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>

              <p className="text-[10px] text-slate-300 text-right">
                Distribuição proporcional por dias úteis (seg–sex) ·
                Fonte: mo_planejamento · {registros.length} registro{registros.length !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
