import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, DollarSign, ClipboardCheck, ShoppingCart, AlertTriangle,
  ExternalLink, ArrowRight, Loader2, Calendar, Handshake, FileText,
  TrendingUp, Package, ChevronDown
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import KpiCard from '../components/ui/KpiCard'
import ResumoCronograma from '../components/dashboard/ResumoCronograma'
import { obrasService, contratosService, medicoesContratoService, pedidosCompraService } from '../lib/supabase'
import { formatarMoeda, calcularEvolucaoMensal } from '../lib/calculos'
import { useAuth } from '../context/AuthContext'
import { PERFIS_ACESSO_GLOBAL } from '../lib/acesso.js'
import useObrasAcessiveis from '../hooks/useObrasAcessiveis'
import { useObra } from '../context/ObraContext'

const CORES_STATUS = { em_andamento: '#233772', concluido: '#16a34a', cancelado: '#dc2626' }
const LABELS_STATUS = { em_andamento: 'Em Andamento', concluido: 'Concluído', cancelado: 'Cancelado' }

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const TIPOS_PERIODO = [
  { id: 'tudo',       label: 'Todo Período' },
  { id: 'mes',        label: 'Mês'          },
  { id: 'trimestre',  label: 'Trimestre'    },
  { id: 'semestre',   label: 'Semestre'     },
  { id: 'ano',        label: 'Ano'          },
]


const STATUS_OBRAS = [
  { id: 'todas',      label: 'Todas'      },
  { id: 'ativa',      label: 'Ativas'     },
  { id: 'encerradas', label: 'Encerradas' },
  { id: 'cancelada',  label: 'Canceladas' },
]

export default function Dashboard() {
  const { usuario } = useAuth()
  const { obraSelecionadaId, setObraSelecionada, obraAtual } = useObra()
  const [obras, setObras] = useState([])
  const [contratos, setContratos] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroPeriodo, setFiltroPeriodo] = useState('tudo')
  const [filtroStatusObra, setFiltroStatusObra] = useState('todas')
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1
  const [periodoAno, setPeriodoAno] = useState(anoAtual)
  const [periodoMes, setPeriodoMes] = useState(mesAtual)
  const [periodoTrimestre, setPeriodoTrimestre] = useState(Math.ceil(mesAtual / 3))
  const [periodoSemestre, setPeriodoSemestre] = useState(mesAtual <= 6 ? 1 : 2)

  useEffect(() => {
    async function carregar() {
      try {
        const [o, c, m, p] = await Promise.all([
          obrasService.listar(),
          contratosService.listarTodos(),
          medicoesContratoService.listarTodos(),
          pedidosCompraService.listarTodos(),
        ])
        setObras(o || [])
        setContratos(c || [])
        setMedicoes(m || [])
        setPedidos(p || [])
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  // Aplica filtro de obras acessíveis ao usuário (perfis globais veem todas)
  const isGlobal = PERFIS_ACESSO_GLOBAL.includes(usuario?.perfil)
  const obrasAcessiveis = useObrasAcessiveis(obras)

  // IDs de obras acessíveis independente de filtros de status/seleção
  const obrasAcessiveisIds = useMemo(() => new Set(obrasAcessiveis.map(o => o.id)), [obrasAcessiveis])

  const oFil = useMemo(() => {
    let r = obraSelecionadaId ? obrasAcessiveis.filter(o => o.id === obraSelecionadaId) : obrasAcessiveis
    if (filtroStatusObra === 'ativa') r = r.filter(o => o.status === 'ativa')
    else if (filtroStatusObra === 'encerradas') r = r.filter(o => ['concluida', 'suspensa'].includes(o.status))
    else if (filtroStatusObra === 'cancelada') r = r.filter(o => o.status === 'cancelada')
    return r
  }, [obrasAcessiveis, obraSelecionadaId, filtroStatusObra])

  const obraIds = useMemo(() => new Set(oFil.map(o => o.id)), [oFil])

  // ── Anos disponíveis nos dados (para o seletor de ano)
  const anosDisponiveis = useMemo(() => {
    const s = new Set()
    medicoes.forEach(m => { if (m.data_medicao) s.add(new Date(m.data_medicao).getFullYear()) })
    pedidos.forEach(p => { if (p.data_pedido) s.add(new Date(p.data_pedido).getFullYear()) })
    if (s.size === 0) s.add(new Date().getFullYear())
    return [...s].sort((a, b) => b - a)
  }, [medicoes, pedidos])

  // ── Range de datas para filtro de período (início e fim absolutos)
  const rangePeriodo = useMemo(() => {
    if (filtroPeriodo === 'tudo') return null
    const a = periodoAno
    if (filtroPeriodo === 'mes') {
      return { inicio: new Date(a, periodoMes - 1, 1), fim: new Date(a, periodoMes, 0, 23, 59, 59) }
    }
    if (filtroPeriodo === 'trimestre') {
      const m0 = (periodoTrimestre - 1) * 3
      return { inicio: new Date(a, m0, 1), fim: new Date(a, m0 + 3, 0, 23, 59, 59) }
    }
    if (filtroPeriodo === 'semestre') {
      const m0 = (periodoSemestre - 1) * 6
      return { inicio: new Date(a, m0, 1), fim: new Date(a, m0 + 6, 0, 23, 59, 59) }
    }
    if (filtroPeriodo === 'ano') {
      return { inicio: new Date(a, 0, 1), fim: new Date(a, 11, 31, 23, 59, 59) }
    }
    return null
  }, [filtroPeriodo, periodoAno, periodoMes, periodoTrimestre, periodoSemestre])

  // ── Contratos: perfis globais mantêm bypass para incluir contratos de obras fora da lista.
  // Perfis restritos (supervisor/visualizador): SEMPRE filtram pelas obras acessíveis.
  const cFil = useMemo(() => {
    if (isGlobal && !obraSelecionadaId && filtroStatusObra === 'todas') return contratos
    const base = isGlobal ? contratos : contratos.filter(c => obrasAcessiveisIds.has(c.obra_id))
    return base.filter(c => obraIds.has(c.obra_id))
  }, [contratos, obraIds, obrasAcessiveisIds, isGlobal, obraSelecionadaId, filtroStatusObra])

  // ── Medições: mesma lógica de restrição por perfil
  const mFil = useMemo(() => {
    let r
    if (isGlobal && !obraSelecionadaId && filtroStatusObra === 'todas') {
      r = medicoes
    } else {
      const base = isGlobal ? medicoes : medicoes.filter(m => obrasAcessiveisIds.has(m.obra_id))
      r = base.filter(m => obraIds.has(m.obra_id))
    }
    if (rangePeriodo) r = r.filter(m => {
      if (!m.data_medicao) return false
      const d = new Date(m.data_medicao)
      return d >= rangePeriodo.inicio && d <= rangePeriodo.fim
    })
    return r
  }, [medicoes, obraIds, obrasAcessiveisIds, isGlobal, obraSelecionadaId, filtroStatusObra, rangePeriodo])

  // ── Pedidos: mesma lógica de restrição por perfil
  const pFil = useMemo(() => {
    let r
    if (isGlobal && !obraSelecionadaId && filtroStatusObra === 'todas') {
      r = pedidos
    } else {
      const base = isGlobal ? pedidos : pedidos.filter(p => obrasAcessiveisIds.has(p.obra_id))
      r = base.filter(p => obraIds.has(p.obra_id))
    }
    if (rangePeriodo) r = r.filter(p => {
      if (!p.data_pedido) return false
      const d = new Date(p.data_pedido)
      return d >= rangePeriodo.inicio && d <= rangePeriodo.fim
    })
    return r
  }, [pedidos, obraIds, obrasAcessiveisIds, isGlobal, obraSelecionadaId, filtroStatusObra, rangePeriodo])

  const stats = useMemo(() => {
    const obrasAtivas = oFil.filter(o => o.status === 'ativa').length
    const totalContratado = cFil.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)

    // Medições: valores BRUTOS do Sienge (totalLaborValue + totalMaterialValue)
    // valor_liquido = netValue (após glosas/retenções) — não usar para faturamento
    const totalMO = mFil.reduce((s, m) => s + (parseFloat(m.valor_mao_obra) || 0), 0)
    const totalMaterialMedicao = mFil.reduce((s, m) => s + (parseFloat(m.valor_material) || 0), 0)
    const totalMedido = totalMO + totalMaterialMedicao // bruto = MO + material

    // Pedidos: split próprio (Biasi) vs faturamento direto (em nome do cliente)
    // Critério 1: empresa_faturamento preenchida e não é Biasi
    // Critério 2: contrato_vinculado preenchido (pedido atrelado a contrato = repasse)
    const isFatDireto = (p) =>
      !!(p.contrato_vinculado) ||
      (p.empresa_faturamento && !/biasi/i.test(p.empresa_faturamento))
    const pedidosBiasi = pFil.filter(p => !isFatDireto(p))
    const pedidosCliente = pFil.filter(p => isFatDireto(p))
    const totalPedidosBiasi = pedidosBiasi.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
    const totalPedidosCliente = pedidosCliente.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
    const totalSuprimentos = totalPedidosBiasi + totalPedidosCliente
    const temClassificacaoPedidos = pFil.some(p => p.contrato_vinculado || p.empresa_faturamento)

    const percExec = totalContratado > 0 ? (totalMedido / totalContratado) * 100 : 0
    const pedidosPendentes = pFil.filter(p => !p.autorizado).length
    const medicoesPendentes = mFil.filter(m => m.aprovacao === 'pendente').length
    const hoje = new Date()
    const limite30d = new Date(); limite30d.setDate(limite30d.getDate() + 30)
    const contratosVencer = cFil.filter(c => c.data_fim && new Date(c.data_fim) <= limite30d && new Date(c.data_fim) >= hoje && c.status === 'em_andamento').length
    const medicoesVencidas = mFil.filter(m => m.data_vencimento && new Date(m.data_vencimento) < hoje && !m.finalizada).length
    const fornecedores = new Set(cFil.map(c => c.fornecedor).filter(Boolean)).size
    return {
      obrasAtivas, totalContratado, totalMedido, totalMO, totalMaterialMedicao,
      totalSuprimentos, totalPedidosBiasi, totalPedidosCliente, temClassificacaoPedidos,
      percExec, pedidosPendentes, medicoesPendentes, contratosVencer, medicoesVencidas, fornecedores,
    }
  }, [oFil, cFil, mFil, pFil])

  const porStatus = useMemo(() => {
    const map = {}
    cFil.forEach(c => {
      const st = c.status || 'em_andamento'
      map[st] = (map[st] || 0) + 1
    })
    return Object.entries(map).map(([status, value]) => ({
      name: LABELS_STATUS[status] || status,
      value,
      color: CORES_STATUS[status] || '#B3B3B3',
    }))
  }, [cFil])

  const evolucao = useMemo(() => calcularEvolucaoMensal(mFil), [mFil])

  const obrasRanking = useMemo(() => {
    return oFil.map(o => {
      const cObra = cFil.filter(c => c.obra_id === o.id)
      const mObra = mFil.filter(m => m.obra_id === o.id)
      const contratado = cObra.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
      const medido = mObra.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
      const perc = contratado > 0 ? (medido / contratado) * 100 : 0
      return { ...o, contratado, medido, perc, numContratos: cObra.length }
    }).filter(o => o.contratado > 0 || o.numContratos > 0)
      .sort((a, b) => b.contratado - a.contratado)
      .slice(0, 10)
  }, [oFil, cFil, mFil])

  const alertas = useMemo(() => {
    const items = []
    const hoje = new Date()
    const limite30d = new Date(); limite30d.setDate(limite30d.getDate() + 30)
    cFil.filter(c => c.data_fim && new Date(c.data_fim) <= limite30d && new Date(c.data_fim) >= hoje && c.status === 'em_andamento').slice(0, 5)
      .forEach(c => items.push({ tipo: 'warning', texto: `Contrato ${c.sienge_contract_num} — ${c.fornecedor || 'N/I'} vence em ${new Date(c.data_fim).toLocaleDateString('pt-BR')}`, link: '/contratos' }))
    mFil.filter(m => m.data_vencimento && new Date(m.data_vencimento) < hoje && !m.finalizada).slice(0, 5)
      .forEach(m => items.push({ tipo: 'danger', texto: `Medição ${m.numero_medicao} (contrato ${m.contrato_num}) venceu em ${new Date(m.data_vencimento).toLocaleDateString('pt-BR')}`, link: '/medicoes-contrato' }))
    const pedNaoAut = pFil.filter(p => !p.autorizado).length
    if (pedNaoAut > 0) items.push({ tipo: 'info', texto: `${pedNaoAut} pedido(s) de compra aguardando autorização`, link: '/contratos' })
    return items.slice(0, 8)
  }, [cFil, mFil, pFil])

  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  if (carregando) return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} /></div>

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {obraAtual ? obraAtual.nome : 'Dashboard — Visão Consolidada'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {dataHoje} · {oFil.length} obra{oFil.length !== 1 ? 's' : ''} · {cFil.length} contratos · {mFil.length} medições
            {obraAtual && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">filtro ativo</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-700 font-medium">Dados Sienge</span>
        </div>
      </div>

      {/* Resumo Cronograma - quando obra específica está selecionada */}
      {obraAtual && obraSelecionadaId && (
        <ResumoCronograma obraId={obraSelecionadaId} />
      )}

      {/* Painel de filtros: Período + Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 space-y-3">
        {/* Linha 1: tipo de período + status de obras */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Período</span>
            {TIPOS_PERIODO.map(p => (
              <button
                key={p.id}
                onClick={() => setFiltroPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filtroPeriodo === p.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={filtroPeriodo === p.id ? { backgroundColor: '#233772' } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-gray-200 hidden md:block" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Obras</span>
            {STATUS_OBRAS.map(s => (
              <button
                key={s.id}
                onClick={() => setFiltroStatusObra(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filtroStatusObra === s.id ? 'font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={filtroStatusObra === s.id ? { backgroundColor: '#FFC82D', color: '#1a1a1a' } : {}}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: seletor específico do período (só aparece quando não é "Todo Período") */}
        {filtroPeriodo !== 'tudo' && (
          <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-gray-50">
            {/* Ano — sempre presente quando há filtro */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Ano</span>
              <select
                value={periodoAno}
                onChange={e => setPeriodoAno(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#233772' }}
              >
                {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Mês */}
            {filtroPeriodo === 'mes' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Mês</span>
                <select
                  value={periodoMes}
                  onChange={e => setPeriodoMes(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#233772' }}
                >
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Trimestre */}
            {filtroPeriodo === 'trimestre' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Trimestre</span>
                {[1,2,3,4].map(q => (
                  <button
                    key={q}
                    onClick={() => setPeriodoTrimestre(q)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      periodoTrimestre === q ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={periodoTrimestre === q ? { backgroundColor: '#233772' } : {}}
                  >
                    Q{q}
                  </button>
                ))}
              </div>
            )}

            {/* Semestre */}
            {filtroPeriodo === 'semestre' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Semestre</span>
                {[1,2].map(s => (
                  <button
                    key={s}
                    onClick={() => setPeriodoSemestre(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      periodoSemestre === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={periodoSemestre === s ? { backgroundColor: '#233772' } : {}}
                  >
                    {s}º Sem
                  </button>
                ))}
              </div>
            )}

            {/* Label do range ativo */}
            <span className="text-xs text-gray-400 ml-auto">
              {filtroPeriodo === 'mes' && `${MESES[periodoMes - 1]} ${periodoAno}`}
              {filtroPeriodo === 'trimestre' && `Q${periodoTrimestre} ${periodoAno}`}
              {filtroPeriodo === 'semestre' && `${periodoSemestre}º Semestre ${periodoAno}`}
              {filtroPeriodo === 'ano' && `Ano ${periodoAno}`}
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards — Linha 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard titulo="Obras Ativas" valor={stats.obrasAtivas.toString()} subtitulo={`${oFil.length} total`} icone={Building2} cor="blue" href="/obras" />
        <KpiCard titulo="Total Contratado" valor={formatarMoeda(stats.totalContratado)} icone={DollarSign} cor="blue" href="/contratos" />
        <KpiCard titulo="Total Medido" valor={formatarMoeda(stats.totalMedido)} subtitulo={`${stats.percExec.toFixed(1)}% executado`} icone={ClipboardCheck} cor="green" href="/medicoes-contrato" />
        <KpiCard titulo="Pedidos Pendentes" valor={stats.pedidosPendentes.toString()} subtitulo={`${pFil.length} total`} icone={ShoppingCart} cor={stats.pedidosPendentes > 0 ? 'yellow' : 'green'} href="/suprimentos" />
      </div>

      {/* KPI Cards — Linha 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard titulo="% Executado" valor={`${stats.percExec.toFixed(1)}%`} icone={ClipboardCheck} cor="blue" href="/contratos" />
        <KpiCard titulo="Contratos a Vencer" valor={stats.contratosVencer.toString()} subtitulo="Próximos 30 dias" icone={Calendar} cor={stats.contratosVencer > 0 ? 'yellow' : 'green'} href="/contratos" />
        <KpiCard titulo="Medições Pendentes" valor={stats.medicoesPendentes.toString()} subtitulo="Aguardando aprovação" icone={FileText} cor={stats.medicoesPendentes > 0 ? 'yellow' : 'green'} href="/medicoes-contrato" />
        <KpiCard titulo="Fornecedores" valor={stats.fornecedores.toString()} subtitulo="Distintos" icone={Handshake} cor="gray" href="/contratos" />
      </div>

      {/* Resumo Financeiro — Faturamento vs Suprimentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Painel Faturamento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-green-600" />
            <h3 className="font-semibold text-gray-700 text-sm">Faturamento</h3>
            <span className="text-xs text-gray-400 ml-1">— medições de contrato</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Mão de Obra Biasi</span>
              <span className="text-sm font-semibold text-gray-700">{formatarMoeda(stats.totalMO)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Faturamento Direto (material via contrato)</span>
              <span className="text-sm font-semibold text-gray-700">{formatarMoeda(stats.totalMaterialMedicao)}</span>
            </div>
            {stats.totalMedido > 0 && (
              <div className="pt-1">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${(stats.totalMO / stats.totalMedido) * 100}%` }} />
                  <div className="h-full bg-blue-400 transition-all" style={{ width: `${(stats.totalMaterialMedicao / stats.totalMedido) * 100}%` }} />
                </div>
                <div className="flex gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />MO</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />Direto</span>
                </div>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-600">Total Medido (bruto)</span>
              <span className="text-base font-bold text-green-600">{formatarMoeda(stats.totalMedido)}</span>
            </div>
          </div>
        </div>

        {/* Painel Suprimentos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-orange-500" />
            <h3 className="font-semibold text-gray-700 text-sm">Suprimentos</h3>
            <span className="text-xs text-gray-400 ml-1">— pedidos de compra</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Aquisição Própria (Biasi)</span>
              </div>
              <span className="text-sm font-semibold text-gray-700">{formatarMoeda(stats.totalPedidosBiasi)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Em Nome do Cliente (Fat. Direto)</span>
                {!stats.temClassificacaoPedidos && (
                  <span className="text-[10px] text-amber-500 font-medium border border-amber-200 bg-amber-50 px-1 rounded">aguarda sync</span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-700">{formatarMoeda(stats.totalPedidosCliente)}</span>
            </div>
            {stats.totalSuprimentos > 0 && (
              <div className="pt-1">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-orange-500 transition-all" style={{ width: `${stats.totalSuprimentos > 0 ? (stats.totalPedidosBiasi / stats.totalSuprimentos) * 100 : 0}%` }} />
                  <div className="h-full bg-purple-400 transition-all" style={{ width: `${stats.totalSuprimentos > 0 ? (stats.totalPedidosCliente / stats.totalSuprimentos) * 100 : 0}%` }} />
                </div>
                <div className="flex gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" />Biasi</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-sm bg-purple-400 inline-block" />Cliente</span>
                </div>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-600">Total Compras</span>
              <span className="text-base font-bold text-orange-600">{formatarMoeda(stats.totalSuprimentos)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tabela de obras */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {obraAtual ? 'Contratos da Obra' : 'Top Obras por Valor Contratado'}
            </h2>
            <Link to="/obras" className="text-xs font-medium flex items-center gap-1" style={{ color: '#233772' }}>
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Obra', 'Contratos', 'Contratado', 'Medido', '% Exec.', ''].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {obrasRanking.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-xs">{o.nome}</p>
                      <p className="text-xs text-gray-400">{o.codigo}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">{o.numContratos}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatarMoeda(o.contratado)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">{formatarMoeda(o.medido)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(o.perc, 100)}%`, backgroundColor: '#233772' }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-12">{o.perc.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link to={`/obras/${o.id}`} className="p-1.5 hover:bg-blue-50 rounded-md transition-colors inline-flex" style={{ color: '#233772' }}>
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coluna direita: pizza + alertas */}
        <div className="space-y-6">
          {porStatus.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Contratos por Status</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={porStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {porStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {porStatus.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600">{s.name}: <strong>{s.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alertas.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" /> Alertas e Pendências
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {alertas.map((a, i) => (
                  <Link key={i} to={a.link} className="block">
                    <div className={`flex items-start gap-2 p-2.5 rounded-lg text-xs transition-colors hover:bg-gray-50 ${
                      a.tipo === 'danger' ? 'bg-red-50/50 border border-red-100' :
                      a.tipo === 'warning' ? 'bg-amber-50/50 border border-amber-100' :
                      'bg-blue-50/50 border border-blue-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                        a.tipo === 'danger' ? 'bg-red-500' : a.tipo === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-gray-700">{a.texto}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evolução mensal */}
      {evolucao.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Evolução Financeira Mensal — Medições</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {obraAtual ? `Obra: ${obraAtual.nome}` : 'Valores mensais e acumulado em todas as obras'}
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evolucao} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis yAxisId="left" tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip formatter={(v) => [formatarMoeda(v)]} labelStyle={{ fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar yAxisId="left" dataKey="valor" name="Mensal" fill="#FFC82D" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado" stroke="#233772" strokeWidth={2.5} dot={{ fill: '#233772', r: 3 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
  }