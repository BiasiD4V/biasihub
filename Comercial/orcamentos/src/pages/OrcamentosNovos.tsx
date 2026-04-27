import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, FileText, LayoutGrid, List, TrendingUp, CheckCircle, DollarSign, BarChart2, AlertTriangle, Edit2 } from 'lucide-react';
import { useNovoOrcamento } from '../context/NovoOrcamentoContext';
import { ModalNovoOrcamento } from '../components/orcamentos/ModalNovoOrcamento';
import { KanbanFunil } from '../components/orcamentos/KanbanFunil';
import { ModalEditarProposta } from '../components/orcamentos/ModalEditarProposta';
import {
  propostasRepository,
  type PropostaSupabase,
  type FiltrosPropostas,
} from '../infrastructure/supabase/propostasRepository';
import { ETAPA_LABELS, ETAPA_CORES } from '../domain/value-objects/EtapaFunil';
import type { EtapaFunil } from '../domain/value-objects/EtapaFunil';
import { formatarMoeda, formatarData } from '../utils/calculos';
import { buildHMap, calcularScoreComHMap, type HistoricoSlim } from '../utils/prioridade';

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
  const [clienteOpcoes, setClienteOpcoes] = useState<string[]>([]);
  const [kpis, setKpis] = useState({ total: 0, fechadas: 0, valorTotal: 0 });
  const [propostaEditando, setPropostaEditando] = useState<PropostaSupabase | null>(null);

  const [toastMsg, setToastMsg] = useState('');
  const [hMap, setHMap] = useState<ReturnType<typeof buildHMap>>({});

  const POR_PAGINA = 50;
  const totalPaginas = Math.ceil(propostasTotal / POR_PAGINA);

  // Carregar opções de filtro, KPIs e histórico para scoring ABC
  useEffect(() => {
    if (visualizacao !== 'lista') return;
    propostasRepository.listarStatus().then(setStatusOpcoes).catch(console.error);
    propostasRepository.listarDisciplinas().then(setDisciplinaOpcoes).catch(console.error);
    propostasRepository.listarResponsaveis().then(setResponsavelOpcoes).catch(console.error);
    propostasRepository.listarClientes().then(setClienteOpcoes).catch(console.error);
    propostasRepository
      .buscarKPIs()
      .then((k) => setKpis({ total: k.total, fechadas: k.fechadas, valorTotal: k.valorTotal }))
      .catch(console.error);
    // Carrega histórico completo para calcular score ABC
    propostasRepository.buscarTodosParaHistorico()
      .then((rows) => setHMap(buildHMap(rows as HistoricoSlim[])))
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
    setToastMsg('Proposta salva com sucesso!');
    setTimeout(() => setToastMsg(''), 3000);
  }

  function calcularPrioridadeProposta(p: PropostaSupabase): { label: string; cor: string; pts: number } {
    const { pts, classe } = calcularScoreComHMap(p, hMap);
    // Cores escuras compatíveis com o tema da lista
    const corMap = {
      A: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      B: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
      C: 'bg-white/5 text-slate-400 border border-white/10',
    };
    return { label: classe, cor: corMap[classe], pts };
  }

  function getAlertasProposta(p: PropostaSupabase): string[] {
    const alertas: string[] = [];
    // Só mostra alertas se a proposta já tem funil comercial configurado
    if (!p.etapa_funil && !p.resultado_comercial) return alertas;
    if (p.resultado_comercial && p.resultado_comercial !== 'em_andamento') return alertas;
    if (p.data_proxima_acao) {
      const hoje = new Date();
      const dataAcao = new Date(p.data_proxima_acao + 'T00:00:00');
      if (dataAcao < hoje) alertas.push('Ação vencida');
    }
    if (!p.proxima_acao && !p.data_proxima_acao) alertas.push('Sem próxima ação');
    if (p.ultima_interacao) {
      const dias = Math.floor((Date.now() - new Date(p.ultima_interacao + 'T00:00:00').getTime()) / 86400000);
      if (dias > 7) alertas.push(`Sem interação há ${dias}d`);
    }
    return alertas;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-4 py-3 sm:px-8 sm:py-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Orçamentos</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {visualizacao === 'lista'
                ? `${propostasTotal.toLocaleString('pt-BR')} proposta(s)`
                : `${orcamentos.length} orçamento${orcamentos.length !== 1 ? 's' : ''} no funil`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setVisualizacao('lista')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  visualizacao === 'lista'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List size={14} />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                onClick={() => setVisualizacao('kanban')}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  visualizacao === 'kanban'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>

            <button
              onClick={() => setModalAberto(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors shadow-sm"
            >
              <PlusCircle size={16} />
              <span className="hidden sm:inline">Novo Orçamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className={`flex-1 ${visualizacao === 'kanban' ? 'p-4 sm:p-6 overflow-hidden flex flex-col' : 'p-3 sm:p-6 overflow-auto'}`}>

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="bg-blue-50 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><BarChart2 size={18} className="text-blue-600" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate">Total</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-800">{kpis.total.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="bg-green-50 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><CheckCircle size={18} className="text-green-600" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate">Fechadas</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-800">{kpis.fechadas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="bg-yellow-50 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><DollarSign size={18} className="text-yellow-600" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate">Valor Orçado</p>
                  <p className="text-sm sm:text-lg font-bold text-slate-800">{formatarMoeda(kpis.valorTotal, true)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <div className="bg-purple-50 p-1.5 sm:p-2 rounded-lg flex-shrink-0"><TrendingUp size={18} className="text-purple-600" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate">Fechamento</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-800">{taxaFechamento}%</p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 mb-4">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 items-end">
                <div className="col-span-2 sm:flex-1 sm:min-w-[200px]">
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
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Todos anos</option>
                    {ANOS_PROPOSTAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select
                    value={filtroStatus ?? ''}
                    onChange={(e) => { setFiltroStatus(e.target.value || null); setPropostasPagina(0) }}
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Todos status</option>
                    {statusOpcoes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="hidden sm:block">
                  <label className="block text-xs text-slate-500 mb-1">Disciplina</label>
                  <select
                    value={filtroDisciplina ?? ''}
                    onChange={(e) => { setFiltroDisciplina(e.target.value || null); setPropostasPagina(0) }}
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Todas</option>
                    {disciplinaOpcoes.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="hidden sm:block">
                  <label className="block text-xs text-slate-500 mb-1">Responsável</label>
                  <select
                    value={filtroResponsavel ?? ''}
                    onChange={(e) => { setFiltroResponsavel(e.target.value || null); setPropostasPagina(0) }}
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Todos</option>
                    {responsavelOpcoes.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button
                  onClick={aplicarBuscaPropostas}
                  className="py-2 px-3 sm:px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Buscar
                </button>
                <button
                  onClick={limparFiltros}
                  className="py-2 px-3 sm:px-4 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
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

            {/* Cards — mobile only */}
            <div className="sm:hidden space-y-2">
              {propostasCarregando ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm">Carregando...</p>
                </div>
              ) : propostas.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Nenhuma proposta encontrada.</p>
                </div>
              ) : (
                propostas.map((p) => {
                  const statusCor =
                    p.status === 'FECHADO' ? 'border-l-green-500' :
                    p.status === 'ENVIADO' ? 'border-l-blue-500' :
                    p.status === 'NÃO FECHADO' ? 'border-l-red-500' :
                    p.status === 'CANCELADO' ? 'border-l-red-400' :
                    p.status === 'DECLINADO' ? 'border-l-orange-400' :
                    'border-l-slate-300';
                  const prio = calcularPrioridadeProposta(p);
                  const alertas = getAlertasProposta(p);
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/orcamentos/${p.id}`)}
                      className={`bg-white rounded-xl border border-slate-200 border-l-4 ${statusCor} p-3 cursor-pointer active:bg-slate-50`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">{p.cliente || '—'}</p>
                          <p className="text-xs text-slate-500 truncate">{p.obra || '—'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold ${prio.cor}`}>
                            {prio.label}
                            <span className="font-normal opacity-70">{prio.pts}</span>
                          </span>
                          {alertas.length > 0 && (
                            <AlertTriangle size={13} className="text-amber-500" />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setPropostaEditando(p); }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-slate-400">{p.numero_composto}</span>
                        {p.status && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${PROPOSTAS_STATUS_CORES[p.status] || 'bg-slate-100 text-slate-600'}`}>
                            {p.status}
                          </span>
                        )}
                        {p.disciplina && (
                          <span className="text-[10px] text-slate-400">{p.disciplina}</span>
                        )}
                        {p.valor_orcado ? (
                          <span className="ml-auto text-xs font-semibold text-slate-700">{formatarMoeda(p.valor_orcado, true)}</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tabela — desktop only */}
            <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
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
                      <th className="px-4 py-3 text-left">Disciplina</th>
                      <th className="px-4 py-3 text-right">Valor Orçado</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Etapa</th>
                      <th className="px-4 py-3 text-center">Prior.</th>
                      <th className="px-4 py-3 text-center">Alertas</th>
                      <th className="px-2 py-3 text-center w-10"></th>
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
                      const etapa = p.etapa_funil as EtapaFunil | null;
                      const etapaCores = etapa ? ETAPA_CORES[etapa] : null;
                      const prio = calcularPrioridadeProposta(p);
                      const alertas = getAlertasProposta(p);
                      return (
                        <tr key={p.id} onClick={() => navigate(`/orcamentos/${p.id}`)} className={`hover:bg-slate-50 transition-colors border-l-4 ${statusCor} cursor-pointer`}>
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
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {p.disciplina || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                            {formatarMoeda(p.valor_orcado, true)}
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
                          <td className="px-4 py-3 text-center">
                            {etapa && etapaCores ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${etapaCores.bg} ${etapaCores.text}`}>
                                {ETAPA_LABELS[etapa]}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${prio.cor}`}>
                              {prio.label}
                              <span className="font-normal opacity-70">{prio.pts}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {alertas.length > 0 ? (
                              <div className="flex items-center justify-center gap-1" title={alertas.join(', ')}>
                                <AlertTriangle size={14} className="text-amber-500" />
                                <span className="text-xs text-amber-600 font-medium">{alertas.length}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); setPropostaEditando(p); }}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar proposta"
                            >
                              <Edit2 size={14} />
                            </button>
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
        clienteOpcoes={clienteOpcoes}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-lg shadow-lg animate-bounce">
          <CheckCircle size={16} />
          {toastMsg}
        </div>
      )}
    </div>
  );
}
