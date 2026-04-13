// ============================================================================
// pages/planejamento/Recursos.jsx
// Histograma de Mão de Obra, Nivelamento e Alocação de Equipe
// SPEC-PLN-002-2026 — Etapa D
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  ComposedChart, Line,
} from 'recharts'
import {
  Users, Plus, Trash2, Edit2, X, Check,
  AlertTriangle, Download, ChevronDown, ChevronUp, SlidersHorizontal, TrendingUp, Building2, Briefcase,
} from 'lucide-react'
import { moPlanejamentoService, moCargosService } from '../../lib/supabase'
import { useObra } from '../../context/ObraContext'
import { usePermissoes } from '../../hooks/usePermissoes'
import {
  FUNCOES_BIASI,
  RATEIO_CONFIG,
  calcularCustoMensal,
  calcularCustoPeriodo,
  agruparPorRateio,
} from '../../lib/custosMO'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v || 0)
}

const RATEIO_ORDEM = ['ELÉTRICA', 'HIDRÁULICA', 'CIVIL', 'INDIRETA', 'FLEXÍVEL']

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, valor, sub, cor = '#3b82f6' }) {
  return (
    <div
      className="rounded-xl border p-4 bg-white flex flex-col gap-1"
      style={{ borderColor: cor + '40' }}
    >
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold" style={{ color: cor }}>{valor}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  )
}

// ─── Modal Adicionar / Editar ─────────────────────────────────────────────────
const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function ModalRecurso({ item, defaultMes, defaultAno, onSalvar, onCancelar }) {
  const DIAS_UTEIS_MES = 22
  const isEdicao = !!item?.id
  const hoje = new Date()

  const [cargoId, setCargoId] = useState(item?.cargo?.id || item?.cargo_id || '')
  const [quantidade, setQuantidade] = useState(item?.quantidade ?? 1)
  const [diasUteis, setDiasUteis] = useState(item?.dias_uteis ?? DIAS_UTEIS_MES)
  const [observacoes, setObservacoes] = useState(item?.observacoes ?? '')
  const [stepNum, setStepNum] = useState(item?.step_num ?? 1)
  const [mesRef, setMesRef] = useState(item?.mes_referencia ?? defaultMes ?? (hoje.getMonth() + 1))
  const [anoRef, setAnoRef] = useState(item?.ano_referencia ?? defaultAno ?? hoje.getFullYear())
  const [salvando, setSalvando] = useState(false)

  const cargoSelecionado = useMemo(
    () => FUNCOES_BIASI.find(c => c.id === cargoId),
    [cargoId]
  )

  // Reseta step para 1 quando muda de cargo
  const handleCargoChange = useCallback((id) => {
    setCargoId(id)
    setStepNum(1)
  }, [])

  // Cargo com step selecionado aplicado (para cálculo de custo)
  const cargoComStep = useMemo(() => {
    if (!cargoSelecionado) return null
    const stepData = cargoSelecionado.steps?.find(s => s.step === stepNum) ?? cargoSelecionado.steps?.[0]
    if (!stepData) return cargoSelecionado
    // Retorna cargo com salarioBase substituído pelo salário do step selecionado
    return { ...cargoSelecionado, salarioBase: stepData.salario }
  }, [cargoSelecionado, stepNum])

  const custoCalc = useMemo(() => {
    if (!cargoComStep) return null
    return calcularCustoPeriodo(cargoComStep, quantidade, diasUteis)
  }, [cargoComStep, quantidade, diasUteis])

  async function handleSalvar() {
    if (!cargoId || quantidade < 1 || diasUteis < 1) return
    setSalvando(true)
    try {
      const stepData = cargoSelecionado?.steps?.find(s => s.step === stepNum) ?? cargoSelecionado?.steps?.[0]
      const payload = {
        ...(item?.id ? { id: item.id } : {}),
        cargo_id: cargoId,
        quantidade: Number(quantidade),
        dias_uteis: Number(diasUteis),
        observacoes,
        step_num: stepNum,
        mes_referencia: Number(mesRef),
        ano_referencia: Number(anoRef),
        salario_base_snapshot: stepData?.salario ?? cargoSelecionado?.salarioBase ?? 0,
        custo_mensal_snapshot: custoCalc?.totalMensalQtd ?? 0,
        custo_total_snapshot: custoCalc?.totalPeriodo ?? 0,
      }
      await onSalvar(payload)
    } finally {
      setSalvando(false)
    }
  }

  // Agrupamento por família para o select
  const cargosPorFamilia = useMemo(() => {
    const grupos = {}
    FUNCOES_BIASI.forEach(c => {
      if (!grupos[c.familia]) grupos[c.familia] = []
      grupos[c.familia].push(c)
    })
    return grupos
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            {isEdicao ? 'Editar Recurso' : 'Adicionar Recurso'}
          </h3>
          <button onClick={onCancelar} className="p-1 rounded hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Cargo */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">Cargo</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={cargoId}
            onChange={e => handleCargoChange(e.target.value)}
          >
            <option value="">Selecione um cargo…</option>
            {Object.entries(cargosPorFamilia).map(([familia, cargos]) => (
              <optgroup key={familia} label={familia}>
                {cargos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.cargo} ({RATEIO_CONFIG[c.rateio]?.label ?? c.rateio})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Step salarial (visível quando cargo tem steps) */}
        {cargoSelecionado?.steps?.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Step Salarial</label>
            <div className="flex gap-1.5 flex-wrap">
              {cargoSelecionado.steps.map(s => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setStepNum(s.step)}
                  className="flex-1 min-w-0 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                  style={{
                    borderColor: stepNum === s.step ? '#233772' : '#e2e8f0',
                    background: stepNum === s.step ? '#233772' : 'transparent',
                    color: stepNum === s.step ? '#fff' : '#6b7280',
                  }}
                >
                  Step {s.step}<br />
                  <span className="font-normal text-[10px]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(s.salario)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mês e Ano de referência */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Mês Referência</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={mesRef}
              onChange={e => setMesRef(Number(e.target.value))}
            >
              {MESES_NOMES.map((nome, i) => (
                <option key={i + 1} value={i + 1}>{nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Ano</label>
            <input
              type="number" min="2020" max="2099"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={anoRef}
              onChange={e => setAnoRef(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Quantidade */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Qtd. Funcionários</label>
            <input
              type="number" min="1" max="999"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={quantidade}
              onChange={e => setQuantidade(Math.max(1, Number(e.target.value)))}
            />
          </div>
          {/* Dias úteis */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Dias Úteis</label>
            <input
              type="number" min="1" max="999"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={diasUteis}
              onChange={e => setDiasUteis(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>

        {/* Preview custo */}
        {custoCalc && (
          <div
            className="rounded-lg p-3 text-xs grid grid-cols-2 gap-2"
            style={{
              backgroundColor: RATEIO_CONFIG[cargoSelecionado?.rateio]?.bg ?? '#f8fafc',
              borderColor: RATEIO_CONFIG[cargoSelecionado?.rateio]?.border ?? '#e2e8f0',
              border: '1px solid',
            }}
          >
            <div>
              <span className="text-slate-500">Custo mensal (equipe):</span>
              <p className="font-bold text-slate-800">{formatBRL(custoCalc.totalMensalQtd)}</p>
            </div>
            <div>
              <span className="text-slate-500">Custo total ({diasUteis} du):</span>
              <p className="font-bold text-slate-800">{formatBRL(custoCalc.totalPeriodo)}</p>
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">Observações</label>
          <textarea
            rows={2}
            className="border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex.: frente 2 – instalação cabos AT"
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancelar}
            className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!cargoId || salvando}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#233772' }}
          >
            {salvando ? 'Salvando…' : isEdicao ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Linha da tabela de recursos ─────────────────────────────────────────────
function LinhaRecurso({ item, podeEditar, onEditar, onExcluir }) {
  const cargo = item.cargo // objeto joinado do supabase
  const cargoLocal = FUNCOES_BIASI.find(c => c.id === cargo?.id) // para cálculos locais
  const rateio = cargo?.rateio ?? 'INDIRETA'
  const cfg = RATEIO_CONFIG[rateio] ?? RATEIO_CONFIG['INDIRETA']

  const custoCalc = useMemo(() => {
    if (!cargoLocal) return null
    return calcularCustoPeriodo(cargoLocal, item.quantidade, item.dias_uteis)
  }, [cargoLocal, item.quantidade, item.dias_uteis])

  return (
    <tr className="border-b hover:bg-slate-50 transition-colors">
      <td className="px-3 py-2.5">
        <span
          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: cfg.bg, color: cfg.cor, border: `1px solid ${cfg.border}` }}
        >
          {cfg.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-slate-800 font-medium">{cargo?.cargo ?? '—'}</td>
      <td className="px-3 py-2.5 text-xs text-center text-slate-500">{item.step_num ? `S${item.step_num}` : '—'}</td>
      <td className="px-3 py-2.5 text-sm text-center text-slate-700">{item.quantidade}</td>
      <td className="px-3 py-2.5 text-sm text-center text-slate-700">{item.dias_uteis}</td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums">
        {custoCalc ? formatBRL(custoCalc.totalMensalQtd) : formatBRL(item.custo_mensal_snapshot)}
      </td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums font-semibold text-slate-800">
        {custoCalc ? formatBRL(custoCalc.totalPeriodo) : formatBRL(item.custo_total_snapshot)}
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-400 max-w-[160px] truncate">
        {item.observacoes || '—'}
      </td>
      {podeEditar && (
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditar(item)}
              className="p-1 rounded hover:bg-blue-50 text-blue-600"
              title="Editar"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onExcluir(item.id)}
              className="p-1 rounded hover:bg-red-50 text-red-500"
              title="Remover"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}

// ─── Tooltip customizado para o gráfico ─────────────────────────────────────
function TooltipHistograma({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-xl shadow-lg p-3 text-xs min-w-[150px]">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="font-semibold tabular-nums">{p.value} func.</span>
        </div>
      ))}
      <p className="mt-1 text-slate-400 font-medium">
        Total: {payload.reduce((s, p) => s + (p.value || 0), 0)} funcionários
      </p>
    </div>
  )
}

// ─── KPI Tile estilo Power BI ─────────────────────────────────────────────────
function KpiPBI({ label, value, sub, accent = '#233772', icon, onClick, href }) {
  const isClickable = !!(onClick || href)
  return (
    <div
      className="bg-white flex flex-col justify-between p-4 gap-2 relative group"
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${accent}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.09)',
        borderRadius: '3px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { if (isClickable) { e.currentTarget.style.boxShadow = `0 3px 12px rgba(0,0,0,0.14)`; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { if (isClickable) { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(0)' } }}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="text-[10px] font-bold uppercase tracking-widest leading-tight"
          style={{ color: '#8a8fa8' }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1">
          {icon && <span style={{ color: accent, opacity: 0.5 }}>{icon}</span>}
          {isClickable && (
            <span style={{ color: accent, opacity: 0.3, fontSize: '9px' }} className="group-hover:opacity-70 transition-opacity">▶</span>
          )}
        </div>
      </div>
      <span
        className="text-3xl font-bold tabular-nums leading-none"
        style={{ color: '#1a1e2e', letterSpacing: '-1px' }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[11px]" style={{ color: '#9ca3af' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

// ─── Tooltip Power BI ────────────────────────────────────────────────────────
function TooltipPBI({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="text-xs min-w-[160px]"
      style={{
        background: '#1a1e2e',
        border: 'none',
        borderRadius: '4px',
        padding: '10px 12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        color: '#fff',
      }}
    >
      <p className="font-bold mb-2 text-white/80">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.fill ?? p.stroke }}>{RATEIO_CONFIG[p.dataKey]?.label ?? p.name}</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex justify-between gap-4 mt-1.5 pt-1.5 border-t border-white/20">
          <span className="text-white/60">Total</span>
          <span className="font-bold">{payload.reduce((s, p) => s + (p.value || 0), 0)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard Geral (Todas as obras) ────────────────────────────────────────
function DashboardGeralRecursos() {
  const navigate = useNavigate()
  const [todos, setTodos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  // ── Filtros interativos ─────────────────────────────────────────────────
  const [filtroFrentes, setFiltroFrentes] = useState([])   // [] = todas
  const [filtroObrasIds, setFiltroObrasIds] = useState([]) // [] = todas
  const [obraDropAberto, setObraDropAberto] = useState(false)

  // ── Filtro mês/ano (padrão = mês corrente) ─────────────────────────────
  const hoje = new Date()
  const [filtroMes, setFiltroMes] = useState(hoje.getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(hoje.getFullYear())
  const [mesDropAberto, setMesDropAberto] = useState(false)

  useEffect(() => {
    setCarregando(true)
    moPlanejamentoService.listarTodas({ mes: filtroMes, ano: filtroAno })
      .then(data => setTodos(data))
      .catch(e => setErro('Erro ao carregar: ' + e.message))
      .finally(() => setCarregando(false))
  }, [filtroMes, filtroAno])

  // ── Helper custo (local calc + fallback snapshot) ───────────────────────
  const calcCusto = useCallback((r) => {
    const c = FUNCOES_BIASI.find(x => x.id === r.cargo?.id)
    if (c) return calcularCustoPeriodo(c, r.quantidade, r.dias_uteis)?.totalMensalQtd ?? 0
    return r.custo_mensal_snapshot ?? 0
  }, [])

  // ── Obras únicas para dropdown de filtro ───────────────────────────────
  const obrasUnicas = useMemo(() => {
    const mapa = {}
    todos.forEach(r => {
      if (!mapa[r.obra_id]) mapa[r.obra_id] = { id: r.obra_id, nome: r.obra?.nome ?? r.obra_id }
    })
    return Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [todos])

  // ── Dados filtrados ─────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    let result = todos
    if (filtroFrentes.length > 0)
      result = result.filter(r => filtroFrentes.includes(r.cargo?.rateio || 'INDIRETA'))
    if (filtroObrasIds.length > 0)
      result = result.filter(r => filtroObrasIds.includes(r.obra_id))
    return result
  }, [todos, filtroFrentes, filtroObrasIds])

  // ── KPIs ────────────────────────────────────────────────────────────────
  const totalFuncionarios = useMemo(() => filtrados.reduce((s, r) => s + (r.quantidade || 0), 0), [filtrados])
  const custoMensalTotal = useMemo(() => filtrados.reduce((s, r) => s + calcCusto(r), 0), [filtrados, calcCusto])
  const obrasComRecurso = useMemo(() => new Set(filtrados.map(r => r.obra_id)).size, [filtrados])
  const cargosDistintos = useMemo(() => new Set(filtrados.map(r => r.cargo_id)).size, [filtrados])
  const custoMedioFunc = useMemo(() => totalFuncionarios > 0 ? custoMensalTotal / totalFuncionarios : 0, [custoMensalTotal, totalFuncionarios])

  // ── Barras empilhadas por obra ──────────────────────────────────────────
  const dadosPorObra = useMemo(() => {
    const mapa = {}
    filtrados.forEach(r => {
      const id = r.obra_id
      if (!mapa[id]) {
        const nome = r.obra?.nome ?? id
        mapa[id] = { nome: nome.length > 18 ? nome.slice(0, 16) + '…' : nome, total: 0 }
        RATEIO_ORDEM.forEach(rat => { mapa[id][rat] = 0 })
      }
      const rat = r.cargo?.rateio || 'INDIRETA'
      if (mapa[id][rat] !== undefined) mapa[id][rat] += r.quantidade
      mapa[id].total += r.quantidade
    })
    return Object.values(mapa).sort((a, b) => b.total - a.total)
  }, [filtrados])

  // ── Donut por frente ────────────────────────────────────────────────────
  const dadosPorRateio = useMemo(() => {
    const totais = {}
    RATEIO_ORDEM.forEach(r => { totais[r] = 0 })
    filtrados.forEach(r => {
      const rat = r.cargo?.rateio || 'INDIRETA'
      if (totais[rat] !== undefined) totais[rat] += r.quantidade
    })
    return RATEIO_ORDEM.filter(r => totais[r] > 0)
      .map(r => ({ name: RATEIO_CONFIG[r]?.label ?? r, value: totais[r], cor: RATEIO_CONFIG[r]?.cor }))
  }, [filtrados])

  // ── Top cargos ──────────────────────────────────────────────────────────
  const topCargos = useMemo(() => {
    const mapa = {}
    filtrados.forEach(r => {
      const nome = r.cargo?.cargo ?? '—'
      const rat = r.cargo?.rateio || 'INDIRETA'
      if (!mapa[nome]) mapa[nome] = { nome: nome.length > 28 ? nome.slice(0, 26) + '…' : nome, quantidade: 0, cor: RATEIO_CONFIG[rat]?.cor ?? '#94a3b8' }
      mapa[nome].quantidade += r.quantidade
    })
    return Object.values(mapa).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8).reverse()
  }, [filtrados])

  // ── Ranking + custo por obra ────────────────────────────────────────────
  const tabelaObras = useMemo(() => {
    const mapa = {}
    filtrados.forEach(r => {
      const id = r.obra_id
      if (!mapa[id]) mapa[id] = { id, nome: r.obra?.nome ?? '—', funcionarios: 0, custoMensal: 0, cargosSet: new Set() }
      mapa[id].funcionarios += r.quantidade
      mapa[id].custoMensal += calcCusto(r)
      if (r.cargo_id) mapa[id].cargosSet.add(r.cargo_id)
    })
    return Object.values(mapa)
      .map(o => ({ ...o, cargos: o.cargosSet.size, custoPerFunc: o.funcionarios > 0 ? o.custoMensal / o.funcionarios : 0 }))
      .sort((a, b) => b.funcionarios - a.funcionarios)
  }, [filtrados, calcCusto])

  const custoPorObraData = useMemo(() =>
    tabelaObras.map(o => ({ nome: o.nome.length > 20 ? o.nome.slice(0, 18) + '…' : o.nome, custo: Math.round(o.custoMensal) })).reverse(),
  [tabelaObras])

  // ── Evolução mensal (apenas quando filtroMes = null = visão anual) ──────
  const dadosPorMes = useMemo(() => {
    if (filtroMes) return [] // só para visão anual
    const meses = MESES_NOMES.map((nome, i) => {
      const obj = { nome: nome.slice(0, 3), mes: i + 1, total: 0, custo: 0 }
      RATEIO_ORDEM.forEach(r => { obj[r] = 0 })
      return obj
    })
    filtrados.forEach(r => {
      const m = r.mes_referencia
      if (m >= 1 && m <= 12) {
        const rat = r.cargo?.rateio || 'INDIRETA'
        meses[m - 1][rat] = (meses[m - 1][rat] || 0) + r.quantidade
        meses[m - 1].total += r.quantidade
        meses[m - 1].custo += calcCusto(r)
      }
    })
    // Calcula custo acumulado (Curva S)
    let acum = 0
    meses.forEach(m => { acum += m.custo; m.custoAcumulado = acum })
    return meses
  }, [filtrados, filtroMes, calcCusto])

  const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const mesDefault = hoje.getMonth() + 1
  const anoDefault = hoje.getFullYear()
  const periodoAlterado = filtroMes !== mesDefault || filtroAno !== anoDefault
  const temFiltro = filtroFrentes.length > 0 || filtroObrasIds.length > 0 || periodoAlterado
  const labelPeriodo = filtroMes ? `${MESES_NOMES[filtroMes - 1]}/${filtroAno}` : `${filtroAno} — Anual`

  function toggleFrente(r) { setFiltroFrentes(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]) }
  function toggleObra(id) { setFiltroObrasIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }

  if (carregando) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ background: '#f0f2f7', fontFamily: 'Montserrat, sans-serif' }}>
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Carregando dashboard…</span>
      </div>
    </div>
  )
  if (erro) return (
    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700 m-6">
      <AlertTriangle size={16} /> {erro}
    </div>
  )
  if (todos.length === 0) return (
    <div style={{ background: '#f0f2f7', minHeight: '100%', fontFamily: 'Montserrat, sans-serif' }}>
      {/* Header mantido mesmo no estado vazio */}
      <div className="flex items-center justify-between px-6 py-3" style={{ background: '#233772' }}>
        <div>
          <h1 className="text-sm font-bold text-white tracking-widest uppercase">Recursos &amp; Equipe</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Consolidado · Todas as obras · {labelPeriodo}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Users size={48} strokeWidth={1} style={{ color: '#8a8fa8' }} />
        {filtroMes ? (
          <>
            <p className="text-base font-semibold text-slate-500">
              Nenhum recurso alocado em {MESES_NOMES[filtroMes - 1]}/{filtroAno ?? hoje.getFullYear()}.
            </p>
            <button
              onClick={() => { setFiltroMes(null); setFiltroAno(null) }}
              className="text-sm font-semibold underline"
              style={{ color: '#233772' }}
            >
              Limpar filtro de período
            </button>
          </>
        ) : (
          <>
            <p className="text-base font-semibold text-slate-500">Nenhum recurso cadastrado.</p>
            <p className="text-sm text-slate-400">Selecione uma obra específica para adicionar recursos.</p>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ background: '#f0f2f7', minHeight: '100%', fontFamily: 'Montserrat, sans-serif' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3" style={{ background: '#233772' }}>
        <div>
          <h1 className="text-sm font-bold text-white tracking-widest uppercase">Recursos &amp; Equipe</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Consolidado · Todas as obras · {labelPeriodo}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
            <div className="font-semibold">{dataAtual}</div>
            <div>{new Set(todos.map(r => r.obra_id)).size} obras · {todos.reduce((s, r) => s + r.quantidade, 0)} func. total</div>
          </div>
          <Users size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
        </div>
      </div>

      {/* ── Barra de Filtros ── */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 border-b" style={{ background: '#fff', borderColor: '#e8eaf0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-1.5" style={{ color: '#8a8fa8' }}>
          <SlidersHorizontal size={12} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Filtros</span>
        </div>

        {/* Chips de frente */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {RATEIO_ORDEM.filter(r => todos.some(x => (x.cargo?.rateio || 'INDIRETA') === r)).map(r => {
            const ativo = filtroFrentes.includes(r)
            const cfg = RATEIO_CONFIG[r]
            return (
              <button key={r} onClick={() => toggleFrente(r)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all"
                style={{ borderRadius: '3px', border: `1.5px solid ${ativo ? cfg.cor : '#e2e6f0'}`, background: ativo ? cfg.bg : 'transparent', color: ativo ? cfg.cor : '#9ca3af' }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: ativo ? cfg.cor : '#d1d5db' }} />
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Dropdown obras */}
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setObraDropAberto(v => !v) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all"
            style={{ borderRadius: '3px', border: `1.5px solid ${filtroObrasIds.length > 0 ? '#233772' : '#e2e6f0'}`, background: filtroObrasIds.length > 0 ? '#eef1f8' : 'transparent', color: filtroObrasIds.length > 0 ? '#233772' : '#9ca3af' }}
          >
            <Building2 size={11} />
            {filtroObrasIds.length > 0 ? `${filtroObrasIds.length} obra(s)` : 'Obras'}
            <ChevronDown size={10} />
          </button>
          {obraDropAberto && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white py-1 min-w-[220px]" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)', borderRadius: '4px', border: '1px solid #e8eaf0' }} onClick={e => e.stopPropagation()}>
              {obrasUnicas.map(o => (
                <label key={o.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={filtroObrasIds.includes(o.id)} onChange={() => toggleObra(o.id)} className="accent-blue-700" />
                  <span className="text-xs text-slate-700 truncate">{o.nome}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown mês/ano */}
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMesDropAberto(v => !v) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all"
            style={{ borderRadius: '3px', border: '1.5px solid #233772', background: '#eef1f8', color: '#233772' }}
          >
            <SlidersHorizontal size={11} />
            {labelPeriodo}
            <ChevronDown size={10} />
          </button>
          {mesDropAberto && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white py-2 px-3 min-w-[240px] flex flex-col gap-2"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)', borderRadius: '4px', border: '1px solid #e8eaf0' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Mês</span>
                  <select
                    className="border rounded px-2 py-1 text-xs text-slate-700"
                    value={filtroMes ?? ''}
                    onChange={e => {
                      const v = e.target.value
                      setFiltroMes(v ? Number(v) : null)
                      if (v && !filtroAno) setFiltroAno(hoje.getFullYear())
                    }}
                  >
                    <option value="">Todos</option>
                    {MESES_NOMES.map((nome, i) => (
                      <option key={i + 1} value={i + 1}>{nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 w-20">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Ano</span>
                  <input
                    type="number" min="2020" max="2099"
                    className="border rounded px-2 py-1 text-xs text-slate-700"
                    value={filtroAno ?? hoje.getFullYear()}
                    onChange={e => setFiltroAno(Number(e.target.value))}
                  />
                </div>
              </div>
              {filtroMes && (
                <button
                  onClick={() => { setFiltroMes(null); setFiltroAno(null) }}
                  className="text-[10px] text-red-500 font-semibold text-left hover:underline"
                >
                  Limpar período
                </button>
              )}
            </div>
          )}
        </div>

        {temFiltro && (
          <button onClick={() => { setFiltroFrentes([]); setFiltroObrasIds([]); setFiltroMes(hoje.getMonth() + 1); setFiltroAno(hoje.getFullYear()) }}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-500 hover:bg-red-50 transition-colors"
            style={{ borderRadius: '3px', border: '1.5px solid #fca5a5' }}
          >
            <X size={10} /> Limpar
          </button>
        )}
        {temFiltro && (
          <span className="text-[10px] text-slate-400 ml-auto">
            {filtrados.length} registro(s) · {totalFuncionarios} func.
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3" onClick={() => { setObraDropAberto(false); setMesDropAberto(false) }}>

        {/* ── 5 KPI Tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiPBI
            label="Total Funcionários"
            value={totalFuncionarios}
            sub={`em ${obrasComRecurso} obra(s)`}
            accent="#233772"
            icon={<Users size={14} />}
            onClick={() => document.getElementById('pbi-ranking')?.scrollIntoView({ behavior: 'smooth' })}
          />
          <KpiPBI
            label={filtroMes ? 'Custo Mensal MO' : 'Custo Total MO'}
            value={formatBRL(custoMensalTotal)}
            sub={filtroMes ? 'ver detalhes ›' : `acumulado ${filtroAno}`}
            accent="#0f7fd4"
            icon={<TrendingUp size={14} />}
            onClick={() => navigate('/financeiro/custos-mo')}
          />
          <KpiPBI
            label="Obras Ativas"
            value={obrasComRecurso}
            sub={`de ${obrasUnicas.length} total · ver obras ›`}
            accent="#107c10"
            icon={<Building2 size={14} />}
            onClick={() => navigate('/obras')}
          />
          <KpiPBI
            label="Cargos Distintos"
            value={cargosDistintos}
            sub="ver top cargos ›"
            accent="#d83b01"
            icon={<Briefcase size={14} />}
            onClick={() => document.getElementById('pbi-top-cargos')?.scrollIntoView({ behavior: 'smooth' })}
          />
          <KpiPBI
            label="Custo Médio/Func."
            value={formatBRL(custoMedioFunc)}
            sub="por funcionário/mês"
            accent="#5c2d91"
            onClick={() => navigate('/financeiro/custos-mo')}
          />
        </div>

        {/* ── Visão Anual: Evolução mensal (só quando filtroMes = null) ── */}
        {!filtroMes && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Funcionários por mês empilhado */}
            <div className="bg-white flex flex-col gap-3 p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: '3px' }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8a8fa8' }}>Evolução Mensal — Funcionários</span>
                <div className="flex gap-3 flex-wrap">
                  {RATEIO_ORDEM.filter(r => dadosPorMes.some(d => d[r] > 0)).map(r => (
                    <div key={r} className="flex items-center gap-1">
                      <div className="w-2 h-2" style={{ background: RATEIO_CONFIG[r]?.cor }} />
                      <span className="text-[10px]" style={{ color: '#8a8fa8' }}>{RATEIO_CONFIG[r]?.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosPorMes} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<TooltipPBI />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  {RATEIO_ORDEM.map(r => <Bar key={r} dataKey={r} fill={RATEIO_CONFIG[r]?.cor} stackId="a" />)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Custo mensal + Curva S acumulada */}
            <div className="bg-white flex flex-col gap-3 p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: '3px' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8a8fa8' }}>Custo MO — Curva S ({filtroAno})</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ background: '#0f7fd4' }} />
                    <span className="text-[10px]" style={{ color: '#8a8fa8' }}>Mensal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5" style={{ background: '#d83b01' }} />
                    <span className="text-[10px]" style={{ color: '#8a8fa8' }}>Acumulado</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={dadosPorMes} barCategoryGap="30%" margin={{ top: 4, right: 40, bottom: 4, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#d83b01', opacity: 0.7 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1a1e2e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                    formatter={(v, name) => [formatBRL(v), name === 'custo' ? 'Custo Mensal' : 'Acumulado']}
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  />
                  <Bar yAxisId="left" dataKey="custo" fill="#0f7fd4" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" dataKey="custoAcumulado" type="monotone" stroke="#d83b01" strokeWidth={2} dot={{ r: 3, fill: '#d83b01', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Linha 1: Barras por obra + Donut ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-white flex flex-col gap-3 p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: '3px' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8a8fa8' }}>Funcionários por Obra e Frente</span>
              <div className="flex gap-3 flex-wrap">
                {RATEIO_ORDEM.filter(r => dadosPorObra.some(d => d[r] > 0)).map(r => (
                  <div key={r} className="flex items-center gap-1">
                    <div className="w-2 h-2" style={{ background: RATEIO_CONFIG[r]?.cor }} />
                    <span className="text-[10px]" style={{ color: '#8a8fa8' }}>{RATEIO_CONFIG[r]?.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dadosPorObra} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 36, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={0} angle={-25} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipPBI />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                {RATEIO_ORDEM.map(r => <Bar key={r} dataKey={r} fill={RATEIO_CONFIG[r]?.cor} stackId="a" />)}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white flex flex-col gap-3 p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: '3px' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8a8fa8' }}>Composição por Frente</span>
            <ResponsiveContainer width="100%" height={155}>
              <PieChart>
                <Pie data={dadosPorRateio} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={2} startAngle={90} endAngle={-270}>
                  {dadosPorRateio.map((entry, i) => <Cell key={i} fill={entry.cor} stroke="none" />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} func.`, n]} contentStyle={{ background: '#1a1e2e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {dadosPorRateio.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-1 h-7 flex-shrink-0 rounded" style={{ background: d.cor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[11px] font-semibold text-slate-700 truncate">{d.name}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: d.cor }}>{d.value}</span>
                    </div>
                    <div className="mt-0.5 h-1 rounded overflow-hidden" style={{ background: '#f0f2f7' }}>
                      <div className="h-full rounded" style={{ width: `${totalFuncionarios > 0 ? (d.value / totalFuncionarios) * 100 : 0}%`, background: d.cor }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 w-7 text-right flex-shrink-0">
                    {totalFuncionarios > 0 ? `${Math.round((d.value / totalFuncionarios) * 100)}%` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Linha 2: Top cargos + Custo por obra ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div id="pbi-top-cargos" className="bg-white flex flex-col gap-3 p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: '3px' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8a8fa8' }}>Top Cargos por Headcount</span>
            <ResponsiveContainer width="100%" height={Math.max(200, topCargos.length * 32)}>
              <BarChart data={topCargos} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap="25%">
                <CartesianGrid horizontal={false} stroke="#f5f5f5" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" width={130} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [`${v} funcionários`, 'Quantidade']} contentStyle={{ background: '#1a1e2e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px' }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="quantidade" radius={[0, 3, 3, 0]}>
                  {topCargos.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white flex flex-col gap-3 p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: '3px' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8a8fa8' }}>Custo Mensal por Obra</span>
            <ResponsiveContainer width="100%" height={Math.max(200, custoPorObraData.length * 38)}>
              <BarChart data={custoPorObraData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} stroke="#f5f5f5" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} />
                <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [formatBRL(v), 'Custo/mês']} contentStyle={{ background: '#1a1e2e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px' }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="custo" fill="#0f7fd4" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Ranking consolidado (tabela full) ── */}
        <div id="pbi-ranking" className="bg-white overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: '3px' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#f0f2f7', background: '#fafbfd' }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8a8fa8' }}>Ranking de Obras — Visão Consolidada</span>
            <span className="text-[10px]" style={{ color: '#c0c4d6' }}>{tabelaObras.length} obra(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f2f7', background: '#fafbfd' }}>
                  {['#', 'Obra', 'Func.', 'Cargos', 'Custo/mês', 'Custo/func.', 'Participação'].map(h => (
                    <th key={h} className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${['Func.', 'Cargos'].includes(h) ? 'text-center' : ['Custo/mês', 'Custo/func.'].includes(h) ? 'text-right' : 'text-left'}`} style={{ color: '#b0b6c8' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabelaObras.map((obra, i) => {
                  const pct = totalFuncionarios > 0 ? (obra.funcionarios / totalFuncionarios) * 100 : 0
                  const isTop = i === 0
                  return (
                    <tr key={obra.id} style={{ borderBottom: '1px solid #f5f6fa' }} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-xs font-bold w-8" style={{ color: isTop ? '#233772' : '#c0c4d6' }}>{isTop ? '▲' : i + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-medium max-w-[180px] truncate" style={{ color: '#374151' }} title={obra.nome}>{obra.nome}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-sm font-bold tabular-nums" style={{ color: '#233772' }}>{obra.funcionarios}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-500">{obra.cargos}</td>
                      <td className="px-3 py-2.5 text-right text-xs tabular-nums" style={{ color: '#374151' }}>{formatBRL(obra.custoMensal)}</td>
                      <td className="px-3 py-2.5 text-right text-xs tabular-nums" style={{ color: '#6b7280' }}>{formatBRL(obra.custoPerFunc)}</td>
                      <td className="px-3 py-2.5 w-40">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ background: '#eef0f7' }}>
                            <div className="h-full rounded" style={{ width: `${pct}%`, background: '#233772' }} />
                          </div>
                          <span className="text-[10px] font-semibold w-7 text-right" style={{ color: '#9ca3af' }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Recursos() {
  const { obraSelecionadaId, obraAtual } = useObra()
  const { editarCronograma, temAcessoObra } = usePermissoes(obraSelecionadaId)

  const hoje = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear())

  const [recursos, setRecursos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [itemEdicao, setItemEdicao] = useState(null)
  const [confirmExcluir, setConfirmExcluir] = useState(null)
  const [expandirTabela, setExpandirTabela] = useState(true)

  // ── Navega mês anterior / próximo ──────────────────────────────────────
  function navegarMes(delta) {
    setMesSelecionado(prev => {
      let m = prev + delta
      if (m < 1) { setAnoSelecionado(a => a - 1); return 12 }
      if (m > 12) { setAnoSelecionado(a => a + 1); return 1 }
      return m
    })
  }

  // ── Carrega recursos da obra filtrado por mês/ano ──────────────────────
  const carregar = useCallback(async () => {
    if (!obraSelecionadaId) { setRecursos([]); return }
    setCarregando(true)
    setErro(null)
    try {
      const data = await moPlanejamentoService.listarPorObra(obraSelecionadaId, { mes: mesSelecionado, ano: anoSelecionado })
      setRecursos(data)
    } catch (e) {
      setErro('Erro ao carregar recursos: ' + e.message)
    } finally {
      setCarregando(false)
    }
  }, [obraSelecionadaId, mesSelecionado, anoSelecionado])

  useEffect(() => { carregar() }, [carregar])

  // ── Cálculos derivados ──────────────────────────────────────────────────
  const linhasCalculo = useMemo(() => {
    return recursos.map(r => {
      const cargoLocal = FUNCOES_BIASI.find(c => c.id === r.cargo?.id)
      if (cargoLocal) return calcularCustoPeriodo(cargoLocal, r.quantidade, r.dias_uteis)
      // fallback: usa snapshots salvos quando cargo não encontrado localmente
      return {
        rateio: r.cargo?.rateio || 'INDIRETA',
        quantidade: r.quantidade,
        diasUteis: r.dias_uteis,
        custoFolhaMensal:  r.custo_mensal_snapshot ?? 0,
        totalMensalQtd:    r.custo_mensal_snapshot ?? 0,
        custoFolhaPeriodo: r.custo_total_snapshot  ?? 0,
        totalPeriodo:      r.custo_total_snapshot  ?? 0,
      }
    })
  }, [recursos])

  const agrupado = useMemo(() => agruparPorRateio(linhasCalculo), [linhasCalculo])

  const totalFuncionarios = useMemo(
    () => recursos.reduce((s, r) => s + (r.quantidade || 0), 0),
    [recursos]
  )

  // ── Dados do histograma (funcionários por rateio) ───────────────────────
  const dadosHistograma = useMemo(() => {
    if (!recursos.length) return []

    // Agrupa recursos por rateio e soma quantidades
    const porRateio = {}
    RATEIO_ORDEM.forEach(r => { porRateio[r] = 0 })
    recursos.forEach(r => {
      const rat = r.cargo?.rateio || 'INDIRETA'
      if (porRateio[rat] !== undefined) porRateio[rat] += r.quantidade
    })

    // Retorna um único ponto representando a alocação atual
    return [{ name: 'Alocação atual', ...porRateio }]
  }, [recursos])

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleSalvar(payload) {
    const salvo = await moPlanejamentoService.salvar({ ...payload, obra_id: obraSelecionadaId })
    setRecursos(prev => {
      const idx = prev.findIndex(r => r.id === salvo.id)
      return idx >= 0 ? prev.map((r, i) => i === idx ? salvo : r) : [...prev, salvo]
    })
    setModalAberto(false)
    setItemEdicao(null)
  }

  async function handleExcluir(id) {
    await moPlanejamentoService.excluir(id)
    setRecursos(prev => prev.filter(r => r.id !== id))
    setConfirmExcluir(null)
  }

  function abrirEdicao(item) {
    setItemEdicao(item)
    setModalAberto(true)
  }

  // ── Exportar CSV simples ─────────────────────────────────────────────────
  function exportarCsv() {
    const linhas = [
      ['Rateio', 'Cargo', 'Qtd.', 'Dias Úteis', 'Custo Mensal (R$)', 'Custo Total (R$)', 'Observações'],
      ...recursos.map(r => {
        const cargoLocal = FUNCOES_BIASI.find(c => c.id === r.cargo?.id)
        const calc = cargoLocal ? calcularCustoPeriodo(cargoLocal, r.quantidade, r.dias_uteis) : null
        return [
          r.cargo?.rateio ?? '',
          r.cargo?.cargo ?? '',
          r.quantidade,
          r.dias_uteis,
          calc ? calc.totalMensalQtd.toFixed(2) : '',
          calc ? calc.totalPeriodo.toFixed(2) : '',
          r.observacoes ?? '',
        ]
      }),
    ]
    const csv = linhas.map(linha => linha.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recursos_${obraAtual?.nome?.replace(/\s+/g, '_') ?? 'obra'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Sem obra selecionada → dashboard consolidado ─────────────────────────
  if (!obraSelecionadaId) {
    return <DashboardGeralRecursos />
  }


  return (
    <div className="p-4 md:p-6 flex flex-col gap-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold" style={{ color: '#233772' }}>
            Recursos e Equipe
          </h1>
          <span className="text-sm text-slate-500">
            Histograma de mão de obra e alocação por frente
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navegador mês/ano */}
          <div
            className="flex items-center rounded-lg border overflow-hidden"
            style={{ borderColor: '#e2e8f0' }}
          >
            <button
              onClick={() => navegarMes(-1)}
              className="px-2.5 py-2 text-slate-500 hover:bg-slate-50 border-r transition-colors"
              style={{ borderColor: '#e2e8f0' }}
              title="Mês anterior"
            >
              <ChevronDown size={14} className="rotate-90" />
            </button>
            <span className="px-3 py-2 text-sm font-semibold text-slate-700 whitespace-nowrap" style={{ minWidth: 120, textAlign: 'center' }}>
              {MESES_NOMES[mesSelecionado - 1]} / {anoSelecionado}
            </span>
            <button
              onClick={() => navegarMes(+1)}
              className="px-2.5 py-2 text-slate-500 hover:bg-slate-50 border-l transition-colors"
              style={{ borderColor: '#e2e8f0' }}
              title="Próximo mês"
            >
              <ChevronDown size={14} className="-rotate-90" />
            </button>
          </div>

          {recursos.length > 0 && (
            <button
              onClick={exportarCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
            >
              <Download size={15} />
              CSV
            </button>
          )}
          {editarCronograma && temAcessoObra && (
            <button
              onClick={() => { setItemEdicao(null); setModalAberto(true) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: '#233772' }}
            >
              <Plus size={15} />
              Adicionar recurso
            </button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={16} />
          {erro}
        </div>
      )}

      {/* Carregando */}
      {carregando && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
          Carregando recursos…
        </div>
      )}

      {!carregando && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Funcionários"
              valor={totalFuncionarios}
              sub={`${recursos.length} registro(s)`}
              cor="#233772"
            />
            <KpiCard
              label="Custo Mensal Total"
              valor={formatBRL(agrupado.TOTAL?.totalMensalQtd ?? 0)}
              sub="equipe completa / mês"
              cor="#1d4ed8"
            />
            {RATEIO_ORDEM.filter(r => (agrupado[r]?.itens?.length ?? 0) > 0).map(r => {
              const g = agrupado[r]
              const cfg = RATEIO_CONFIG[r]
              const qtd = recursos.filter(x => x.cargo?.rateio === r).reduce((s, x) => s + x.quantidade, 0)
              return (
                <KpiCard
                  key={r}
                  label={cfg.label}
                  valor={`${qtd} func.`}
                  sub={formatBRL(g.totalMensalQtd) + '/mês'}
                  cor={cfg.cor}
                />
              )
            })}
          </div>

          {/* Histograma */}
          {recursos.length > 0 && (
            <div className="bg-white rounded-2xl border p-4 flex flex-col gap-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Histograma de Equipe — Funcionários por Frente
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosHistograma} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<TooltipHistograma />} />
                  <Legend
                    formatter={(value) => RATEIO_CONFIG[value]?.label ?? value}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  {RATEIO_ORDEM.map(r => (
                    <Bar
                      key={r}
                      dataKey={r}
                      name={r}
                      fill={RATEIO_CONFIG[r]?.cor}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela de recursos */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setExpandirTabela(v => !v)}
            >
              <span className="flex items-center gap-2">
                <Users size={16} />
                Equipe Alocada ({totalFuncionarios} funcionários, {recursos.length} cargos)
              </span>
              {expandirTabela ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expandirTabela && (
              recursos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Users size={36} strokeWidth={1} />
                  <p className="text-sm">Nenhum recurso alocado nesta obra.</p>
                  {editarCronograma && temAcessoObra && (
                    <button
                      onClick={() => { setItemEdicao(null); setModalAberto(true) }}
                      className="mt-1 text-sm font-semibold underline"
                      style={{ color: '#233772' }}
                    >
                      Adicionar primeiro recurso
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b text-[11px] uppercase text-slate-500 tracking-wide">
                        <th className="px-3 py-2">Frente</th>
                        <th className="px-3 py-2">Cargo</th>
                        <th className="px-3 py-2 text-center">Step</th>
                        <th className="px-3 py-2 text-center">Qtd.</th>
                        <th className="px-3 py-2 text-center">Dias úteis</th>
                        <th className="px-3 py-2 text-right">Custo / mês</th>
                        <th className="px-3 py-2 text-right">Custo total</th>
                        <th className="px-3 py-2">Observações</th>
                        {editarCronograma && temAcessoObra && <th className="px-3 py-2" />}
                      </tr>
                    </thead>
                    <tbody>
                      {RATEIO_ORDEM.map(rateio => {
                        const itens = recursos.filter(r => r.cargo?.rateio === rateio)
                        if (!itens.length) return null
                        return (
                          <React.Fragment key={rateio}>
                            <tr style={{ backgroundColor: RATEIO_CONFIG[rateio]?.bg }}>
                              <td
                                colSpan={editarCronograma && temAcessoObra ? 9 : 8}
                                className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest"
                                style={{ color: RATEIO_CONFIG[rateio]?.cor }}
                              >
                                {RATEIO_CONFIG[rateio]?.label}
                              </td>
                            </tr>
                            {itens.map(item => (
                              <LinhaRecurso
                                key={item.id}
                                item={item}
                                podeEditar={editarCronograma && temAcessoObra}
                                onEditar={abrirEdicao}
                                onExcluir={setConfirmExcluir}
                              />
                            ))}
                          </React.Fragment>
                        )
                      })}
                      {/* Linha de totais */}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                        <td colSpan={5} className="px-3 py-2.5 text-sm text-slate-600">
                          TOTAL — {totalFuncionarios} funcionários
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right tabular-nums text-slate-700">
                          {formatBRL(agrupado.TOTAL?.totalMensalQtd ?? 0)}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right tabular-nums text-slate-800">
                          {formatBRL(agrupado.TOTAL?.totalPeriodo ?? 0)}
                        </td>
                        <td colSpan={editarCronograma && temAcessoObra ? 2 : 1} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* Modal adicionar / editar */}
      {modalAberto && (
        <ModalRecurso
          item={itemEdicao}
          defaultMes={mesSelecionado}
          defaultAno={anoSelecionado}
          onSalvar={handleSalvar}
          onCancelar={() => { setModalAberto(false); setItemEdicao(null) }}
        />
      )}

      {/* Modal confirmar exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={22} />
              <h3 className="text-base font-bold">Remover recurso?</h3>
            </div>
            <p className="text-sm text-slate-500">
              Esta ação removerá o recurso da alocação da obra. O custo total será recalculado.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmExcluir(null)}
                className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExcluir(confirmExcluir)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
