import { useEffect, useState, useCallback } from 'react'
import { Search, TrendingUp, CheckCircle, DollarSign, BarChart2 } from 'lucide-react'
import {
  propostasRepository,
  type PropostaSupabase,
  type FiltrosPropostas,
} from '../infrastructure/supabase/propostasRepository'

const STATUS_CORES: Record<string, string> = {
  FECHADO: 'bg-green-100 text-green-800',
  ENVIADO: 'bg-blue-100 text-blue-800',
  RECEBIDO: 'bg-cyan-100 text-cyan-800',
  'EM REVISÃO': 'bg-yellow-100 text-yellow-800',
  CANCELADO: 'bg-red-100 text-red-800',
  'NÃO FECHADO': 'bg-red-100 text-red-800',
  DECLINADO: 'bg-red-100 text-red-800',
  'CLIENTE NÃO DEU RETORNO': 'bg-gray-100 text-gray-700',
  'NEGOCIAÇÃO FUTURA': 'bg-purple-100 text-purple-800',
  'ORÇAMENTO': 'bg-orange-100 text-orange-800',
}

function formatarMoeda(v: number | null): string {
  if (!v) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatarData(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

const ANOS = [2021, 2022, 2023, 2024, 2025]

export function Propostas() {
  const [propostas, setPropostas] = useState<PropostaSupabase[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [filtroAno, setFiltroAno] = useState<number | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)
  const [filtroDisciplina, setFiltroDisciplina] = useState<string | null>(null)

  const [statusOpcoes, setStatusOpcoes] = useState<string[]>([])
  const [disciplinaOpcoes, setDisciplinaOpcoes] = useState<string[]>([])

  const [kpis, setKpis] = useState({ total: 0, fechadas: 0, valorTotal: 0 })

  const POR_PAGINA = 50
  const totalPaginas = Math.ceil(total / POR_PAGINA)

  // Carregar opções de filtro e KPIs uma vez
  useEffect(() => {
    propostasRepository.listarStatus().then(setStatusOpcoes).catch(console.error)
    propostasRepository.listarDisciplinas().then(setDisciplinaOpcoes).catch(console.error)
    propostasRepository
      .buscarKPIs()
      .then((k) => setKpis({ total: k.total, fechadas: k.fechadas, valorTotal: k.valorTotal }))
      .catch(console.error)
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const filtros: FiltrosPropostas = {
        busca: busca || undefined,
        ano: filtroAno,
        status: filtroStatus,
        disciplina: filtroDisciplina,
      }
      const { data, total: t } = await propostasRepository.listarTodas(pagina, filtros)
      setPropostas(data)
      setTotal(t)
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }, [pagina, busca, filtroAno, filtroStatus, filtroDisciplina])

  useEffect(() => {
    carregar()
  }, [carregar])

  function aplicarBusca() {
    setBusca(buscaInput)
    setPagina(0)
  }

  function limparFiltros() {
    setBusca('')
    setBuscaInput('')
    setFiltroAno(null)
    setFiltroStatus(null)
    setFiltroDisciplina(null)
    setPagina(0)
  }

  const taxaFechamento = kpis.total > 0 ? ((kpis.fechadas / kpis.total) * 100).toFixed(1) : '0'

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Controle de Propostas</h1>
        <p className="text-sm text-gray-500 mt-1">Histórico de propostas comerciais 2021–2025</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg"><BarChart2 size={20} className="text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Total de Propostas</p>
            <p className="text-xl font-bold text-gray-800">{kpis.total.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-green-50 p-2 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Fechadas</p>
            <p className="text-xl font-bold text-gray-800">{kpis.fechadas.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-yellow-50 p-2 rounded-lg"><DollarSign size={20} className="text-yellow-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Valor Total Orçado</p>
            <p className="text-lg font-bold text-gray-800">{formatarMoeda(kpis.valorTotal)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-purple-50 p-2 rounded-lg"><TrendingUp size={20} className="text-purple-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Taxa de Fechamento</p>
            <p className="text-xl font-bold text-gray-800">{taxaFechamento}%</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Buscar</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cliente, obra, número..."
                value={buscaInput}
                onChange={(e) => setBuscaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aplicarBusca()}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {/* Ano */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ano</label>
            <select
              value={filtroAno ?? ''}
              onChange={(e) => { setFiltroAno(e.target.value ? Number(e.target.value) : null); setPagina(0) }}
              className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos</option>
              {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {/* Status */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={filtroStatus ?? ''}
              onChange={(e) => { setFiltroStatus(e.target.value || null); setPagina(0) }}
              className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos</option>
              {statusOpcoes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Disciplina */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Disciplina</label>
            <select
              value={filtroDisciplina ?? ''}
              onChange={(e) => { setFiltroDisciplina(e.target.value || null); setPagina(0) }}
              className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todas</option>
              {disciplinaOpcoes.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {/* Botões */}
          <button
            onClick={aplicarBusca}
            className="py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
          <button
            onClick={limparFiltros}
            className="py-2 px-4 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Contagem */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-sm text-gray-500">
          {carregando ? 'Carregando...' : `${total.toLocaleString('pt-BR')} proposta(s) encontrada(s)`}
        </p>
        {totalPaginas > 1 && (
          <p className="text-sm text-gray-500">
            Página {pagina + 1} de {totalPaginas}
          </p>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        {carregando ? (
          <div className="text-center py-16 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Carregando propostas...</p>
          </div>
        ) : propostas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base">Nenhuma proposta encontrada.</p>
            <p className="text-sm mt-1">Tente ajustar os filtros.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">Número</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Obra / Objeto</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Disciplina</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Responsável</th>
                <th className="px-4 py-3 text-right">Valor Orçado</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {propostas.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                    {p.numero_composto}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatarData(p.data_entrada)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate">
                    {p.cliente || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell max-w-[200px]">
                    <div className="truncate" title={[p.obra, p.objeto].filter(Boolean).join(' · ')}>
                      {p.obra && <span className="text-gray-400 text-xs">{p.obra} · </span>}
                      {p.objeto || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                    {p.disciplina || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                    {p.responsavel || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">
                    {formatarMoeda(p.valor_orcado)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.status ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          STATUS_CORES[p.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.status}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={pagina === 0}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-500 px-3">
            {pagina + 1} / {totalPaginas}
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
            disabled={pagina >= totalPaginas - 1}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
