import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileSpreadsheet,
  Search,
  ChevronRight,
  Copy,
  Trash2,
  CheckCircle,
  Clock,
  FileEdit,
  XCircle,
} from 'lucide-react'
import {
  planilhaRepository,
  type PlanilhaOrcamentaria,
} from '../infrastructure/supabase/planilhaOrcamentariaRepository'

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; cls: string }
> = {
  rascunho: { label: 'Rascunho', icon: FileEdit, cls: 'bg-gray-100 text-gray-600' },
  emitido: { label: 'Emitido', icon: Clock, cls: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovado', icon: CheckCircle, cls: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', icon: XCircle, cls: 'bg-red-100 text-red-600' },
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

export function PlanilhaOrcamentaria() {
  const navigate = useNavigate()
  const [planilhas, setPlanilhas] = useState<PlanilhaOrcamentaria[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    planilhaRepository
      .listarTodas()
      .then(setPlanilhas)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtradas = planilhas.filter((p) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      p.numero.toLowerCase().includes(q) ||
      p.nome_obra.toLowerCase().includes(q) ||
      (p.cliente_nome ?? '').toLowerCase().includes(q)
    )
  })

  async function novaPlanilha() {
    try {
      const numero = await planilhaRepository.proximoNumero()
      navigate('/planilha-orcamentaria/nova', { state: { numero } })
    } catch (e) {
      console.error(e)
      navigate('/planilha-orcamentaria/nova')
    }
  }

  async function duplicar(p: PlanilhaOrcamentaria) {
    try {
      const nova = await planilhaRepository.criarRevisao(p.id)
      navigate(`/planilha-orcamentaria/${nova.id}`)
    } catch (e) {
      console.error(e)
    }
  }

  async function deletar(id: string) {
    try {
      await planilhaRepository.deletar(id)
      setPlanilhas((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setConfirmDelete(null)
    }
  }

  const kpis = {
    total: planilhas.length,
    rascunhos: planilhas.filter((p) => p.status === 'rascunho').length,
    emitidos: planilhas.filter((p) => p.status === 'emitido').length,
    aprovados: planilhas.filter((p) => p.status === 'aprovado').length,
    valorTotal: planilhas.reduce((acc, p) => acc + (p.total_com_bdi || 0), 0),
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-2">
              <FileSpreadsheet size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Planilhas Orçamentárias</h1>
              <p className="text-xs text-slate-500">Criador de orçamentos detalhados</p>
            </div>
          </div>
          <button
            onClick={novaPlanilha}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nova Planilha
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: kpis.total, sub: 'planilhas' },
          { label: 'Rascunhos', value: kpis.rascunhos, sub: 'em edição' },
          { label: 'Emitidos', value: kpis.emitidos, sub: 'aguardando' },
          { label: 'Aprovados', value: kpis.aprovados, sub: fmt(kpis.valorTotal) },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
            <p className="text-xs text-slate-400 truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-6 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número, obra ou cliente..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-slate-400">
            <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
            <span className="text-sm">Carregando planilhas...</span>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileSpreadsheet size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium text-slate-500">
              {busca ? 'Nenhuma planilha encontrada' : 'Nenhuma planilha criada ainda'}
            </p>
            {!busca && (
              <button
                onClick={novaPlanilha}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Criar primeira planilha
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Número / Revisão</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente / Obra</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Data</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Total c/ BDI</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p) => {
                  const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.rascunho
                  const Icon = sc.icon
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-blue-600">{p.numero}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">R{p.revisao} · {p.tipo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 truncate max-w-[200px]">{p.nome_obra}</div>
                        <div className="text-xs text-slate-500 truncate">{p.cliente_nome ?? 'Sem cliente'}</div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">
                        {fmtData(p.data_proposta)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-right">
                        <span className={`text-sm font-semibold ${p.total_com_bdi > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                          {p.total_com_bdi > 0 ? fmt(p.total_com_bdi) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${sc.cls}`}>
                          <Icon size={10} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/planilha-orcamentaria/${p.id}`)}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Abrir planilha"
                          >
                            <ChevronRight size={15} />
                          </button>
                          <button
                            onClick={() => duplicar(p)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Nova revisão"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-slate-800 mb-2">Excluir planilha?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Esta ação não pode ser desfeita. Todos os itens serão excluídos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => deletar(confirmDelete)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
