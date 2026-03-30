import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, FileText, LayoutGrid, List, TrendingUp, CheckCircle, DollarSign, BarChart2 } from 'lucide-react';
import { useNovoOrcamento } from '../context/NovoOrcamentoContext';
import { ModalNovoOrcamento } from '../components/orcamentos/ModalNovoOrcamento';
import { KanbanFunil } from '../components/orcamentos/KanbanFunil';
import { ModalEditarProposta } from '../components/orcamentos/ModalEditarProposta';
import {
  propostasRepository,
  type PropostaSupabase,
  type FiltrosPropostas,
} from '../infrastructure/supabase/propostasRepository';

const PROPOSTAS_STATUS_CORES: Record<string, string> = {
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
};

function formatarMoeda(v: number | null): string {
  if (!v) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function formatarData(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

const ANOS_PROPOSTAS = [2021, 2022, 2023, 2024, 2025, 2026];

export function OrcamentosNovos() {
  const navigate = useNavigate();
  const { orcamentos } = useNovoOrcamento();
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'lista' | 'kanban'>('lista');

  // === Estado das Propostas (Supabase) ===
  const [propostas, setPropostas] = useState<PropostaSupabase[]>([]);
  const [propostasTotal, setPropostasTotal] = useState(0);
  const [propostasPagina, setPropostasPagina] = useState(0);
  const [propostasCarregando, setPropostasCarregando] = useState(false);
  const [propostasBusca, setPropostasBusca] = useState('');
  const [propostasBuscaInput, setPropostasBuscaInput] = useState('');
  const [filtroAno, setFiltroAno] = useState<number | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [filtroDisciplina, setFiltroDisciplina] = useState<string | null>(null);
  const [filtroResponsavel, setFiltroResponsavel] = useState<string | null>(null);
  const [statusOpcoes, setStatusOpcoes] = useState<string[]>([]);
  const [disciplinaOpcoes, setDisciplinaOpcoes] = useState<string[]>([]);
  const [responsavelOpcoes, setResponsavelOpcoes] = useState<string[]>([]);
  const [kpis, setKpis] = useState({ total: 0, fechadas: 0, valorTotal: 0 });
  const [propostaEditando, setPropostaEditando] = useState<PropostaSupabase | null>(null);

  const POR_PAGINA = 50;
  const totalPaginas = Math.ceil(propostasTotal / POR_PAGINA);

  // Carregar opções de filtro e KPIs na lista
  useEffect(() => {
    if (visualizacao !== 'lista') return;
    propostasRepository.listarStatus().then(setStatusOpcoes).catch(console.error);
    propostasRepository.listarDisciplinas().then(setDisciplinaOpcoes).catch(console.error);
    propostasRepository.listarResponsaveis().then(setResponsavelOpcoes).catch(console.error);
    propostasRepository
      .buscarKPIs()
      .then((k) => setKpis({ total: k.total, fechadas: k.fechadas, valorTotal: k.valorTotal }))
      .catch(console.error);
  }, [visualizacao]);

  const carregarPropostas = useCallback(async () => {
    setPropostasCarregando(true);
    try {
      const filtros: FiltrosPropostas = {
        busca: propostasBusca || undefined,
        ano: filtroAno,
        status: filtroStatus,
        disciplina: filtroDisciplina,
        responsavel: filtroResponsavel,
      };
      const { data, total: t } = await propostasRepository.listarTodas(propostasPagina, filtros);
      setPropostas(data);
      setPropostasTotal(t);
    } catch (e) {
      console.error(e);
    } finally {
      setPropostasCarregando(false);
    }
  }, [propostasPagina, propostasBusca, filtroAno, filtroStatus, filtroDisciplina, filtroResponsavel]);

  useEffect(() => {
    if (visualizacao === 'lista') carregarPropostas();
  }, [visualizacao, carregarPropostas]);

  function aplicarBuscaPropostas() {
    setPropostasBusca(propostasBuscaInput);
    setPropostasPagina(0);
  }

  function limparFiltros() {
    setPropostasBusca('');
    setPropostasBuscaInput('');
    setFiltroAno(null);
    setFiltroStatus(null);
    setFiltroDisciplina(null);
    setFiltroResponsavel(null);
    setPropostasPagina(0);
  }

  const taxaFechamento = kpis.total > 0 ? ((kpis.fechadas / kpis.total) * 100).toFixed(1) : '0';

  const filtradosKanban = orcamentos.filter(
    (o) =>
      o.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      o.numero.toLowerCase().includes(busca.toLowerCase()) ||
      o.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      o.responsavel.toLowerCase().includes(busca.toLowerCase())
  );

  function handleCriado(id: string) {
    setModalAberto(false);
    navigate(`/orcamentos/${id}`);
  }

  function handlePropostaSalva(p: PropostaSupabase) {
    setPropostas((prev) => prev.map((old) => (old.id === p.id ? p : old)));
    setPropostaEditando(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Orçamentos</h1>
          <p className="text-sm text-slate-500 mt-1">
            {visualizacao === 'lista'
              ? `${propostasTotal.toLocaleString('pt-BR')} proposta(s) registrada(s)`
              : `${orcamentos.length} orçamento${orcamentos.length !== 1 ? 's' : ''} no funil`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setVisualizacao('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                visualizacao === 'lista'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={14} />
              Lista
            </button>
            <button
              onClick={() => setVisualizacao('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                visualizacao === 'kanban'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={14} />
              Kanban
            </button>
          </div>

          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle size={16} />
            Novo Orçamento
          </button>
        </div>
      </div>

      {/* Corpo */}
      <div className={`flex-1 p-8 ${visualizacao === 'kanban' ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>

        {/* ══════ KANBAN ══════ */}
        {visualizacao === 'kanban' && (
          <>
            <div className="mb-6 relative max-w-sm flex-shrink-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título, número, cliente..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 overflow-auto">
              <KanbanFunil orcamentos={filtradosKanban} />
            </div>
          </>
        )}

        {/* ══════ LISTA (Supabase) ══════ */}
        {visualizacao === 'lista' && (
          <div>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg"><BarChart2 size={20} className="text-blue-600" /></div>
                <div>
                  <p className="text-xs text-slate-500">Total de Propostas</p>
                  <p className="text-xl font-bold text-slate-800">{kpis.total.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="bg-green-50 p-2 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
                <div>
                  <p className="text-xs text-slate-500">Fechadas</p>
                  <p className="text-xl font-bold text-slate-800">{kpis.fechadas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="bg-yellow-50 p-2 rounded-lg"><DollarSign size={20} className="text-yellow-600" /></div>
                <div>
                  <p className="text-xs text-slate-500">Valor Total Orçado</p>
                  <p className="text-lg font-bold text-slate-800">{formatarMoeda(kpis.valorTotal)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="bg-purple-50 p-2 rounded-lg"><TrendingUp size={20} className="text-purple-600" /></div>
                <div>
                  <p className="text-xs text-slate-500">Taxa de Fechamento</p>
                  <p className="text-xl font-bold text-slate-800">{taxaFechamento}%</p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-slate-500 mb-1">Buscar</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cliente, obra, número..."
                      value={propostasBuscaInput}
                      onChange={(e) => setPropostasBuscaInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && aplicarBuscaPropostas()}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Ano</label>
                  <select
                    value={filtroAno ?? ''}
                    onChange={(e) => { setFiltroAno(e.target.value ? Number(e.target.value) : null); setPropostasPagina(0) }}
                    className="py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Todos</option>
                    {ANOS_PROPOSTAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select
                    value={filtroStatus ?? ''}
                    onChange={(e) => { setFiltroStatus(e.target.value || null); setPropostasPagina(0) }}
                    className="py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Todos</option>
                    {statusOpcoes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Disciplina</label>
                  <select
                    value={filtroDisciplina ?? ''}
                    onChange={(e) => { setFiltroDisciplina(e.target.value || null); setPropostasPagina(0) }}
                    className="py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Todas</option>
                    {disciplinaOpcoes.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Responsável</label>
                  <select
                    value={filtroResponsavel ?? ''}
                    onChange={(e) => { setFiltroResponsavel(e.target.value || null); setPropostasPagina(0) }}
                    className="py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Todos</option>
                    {responsavelOpcoes.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button
                  onClick={aplicarBuscaPropostas}
                  className="py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Buscar
                </button>
                <button
                  onClick={limparFiltros}
                  className="py-2 px-4 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Contagem + Paginação */}
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-sm text-slate-500">
                {propostasCarregando ? 'Carregando...' : `${propostasTotal.toLocaleString('pt-BR')} proposta(s) encontrada(s)`}
              </p>
              {totalPaginas > 1 && (
                <p className="text-sm text-slate-500">
                  Página {propostasPagina + 1} de {totalPaginas}
                </p>
              )}
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              {propostasCarregando ? (
                <div className="text-center py-16 text-slate-400">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm">Carregando propostas...</p>
                </div>
              ) : propostas.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <div className="bg-slate-100 rounded-2xl p-5 mb-4 inline-block">
                    <FileText size={32} className="text-slate-400" />
                  </div>
                  <p className="text-base">Nenhuma proposta encontrada.</p>
                  <p className="text-sm mt-1">Tente ajustar os filtros.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">Número</th>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Obra</th>
                      <th className="px-4 py-3 text-left">Objeto</th>
                      <th className="px-4 py-3 text-left">Disciplina</th>
                      <th className="px-4 py-3 text-left">Responsável</th>
                      <th className="px-4 py-3 text-right">Valor Orçado</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {propostas.map((p) => {
                      const statusCor =
                        p.status === 'FECHADO' ? 'border-l-green-500' :
                        p.status === 'ENVIADO' ? 'border-l-blue-500' :
                        p.status === 'NÃO FECHADO' ? 'border-l-red-500' :
                        p.status === 'CANCELADO' ? 'border-l-red-400' :
                        p.status === 'DECLINADO' ? 'border-l-orange-400' :
                        'border-l-slate-200';
                      return (
                        <tr key={p.id} onClick={() => setPropostaEditando(p)} className={`hover:bg-slate-50 transition-colors border-l-4 ${statusCor} cursor-pointer`}>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                            {p.numero_composto}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {formatarData(p.data_entrada)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">
                            {p.cliente || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate" title={p.obra || ''}>
                            {p.obra || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={p.objeto || ''}>
                            {p.objeto || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {p.disciplina || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {p.responsavel || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                            {formatarMoeda(p.valor_orcado)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.status ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                  PROPOSTAS_STATUS_CORES[p.status] || 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {p.status}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPropostasPagina((p) => Math.max(0, p - 1))}
                  disabled={propostasPagina === 0}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-slate-500 px-3">
                  {propostasPagina + 1} / {totalPaginas}
                </span>
                <button
                  onClick={() => setPropostasPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={propostasPagina >= totalPaginas - 1}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Próxima →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Novo */}
      <ModalNovoOrcamento
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onCriado={handleCriado}
      />

      {/* Modal Editar Proposta */}
      <ModalEditarProposta
        proposta={propostaEditando}
        onFechar={() => setPropostaEditando(null)}
        onSalvo={handlePropostaSalva}
        statusOpcoes={statusOpcoes}
        disciplinaOpcoes={disciplinaOpcoes}
        responsavelOpcoes={responsavelOpcoes}
      />
    </div>
  );
}
