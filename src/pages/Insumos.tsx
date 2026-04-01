import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Search, AlertTriangle, ChevronLeft, ChevronRight,
  History, TrendingUp, TrendingDown, Minus, X, Filter, Clock,
  Truck, Ruler, CalendarDays, CircleDollarSign, RotateCcw,
  ChevronDown, Hash, BarChart3, Layers, ArrowUpDown, ArrowUp, ArrowDown,
  FolderTree, TableProperties,
} from 'lucide-react';
import {
  insumosRepository,
  type Insumo,
  type InsumoHistorico,
  type FiltrosInsumos,
} from '../infrastructure/supabase/insumosRepository';
import { CatalogoArvore } from '../components/insumos/CatalogoArvore';

/* ═══════════════════ Helpers ═══════════════════ */

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FMT_DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const UNIDADE_LABELS: Record<string, string> = {
  BR: 'Barra', CX: 'Caixa', GL: 'Galão', KG: 'Quilograma',
  M: 'Metro', 'M²': 'Metro Quadrado', 'M³': 'Metro Cúbico',
  PÇ: 'Peça', RL: 'Rolo', VB: 'Verba', UN: 'Unidade', L: 'Litro',
  T: 'Tonelada', H: 'Hora', D: 'Dia',
};

function badgeAlerta(dias: number | null) {
  if (dias === null || dias === undefined) return <span className="text-slate-300 text-xs">—</span>;
  if (dias >= 365) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle size={10} /> {Math.floor(dias / 365)}a {Math.floor((dias % 365) / 30)}m
    </span>
  );
  if (dias >= 180) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-100">
      <AlertTriangle size={10} /> {dias}d
    </span>
  );
  if (dias >= 90) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
      <Clock size={10} /> {dias}d
    </span>
  );
  if (dias >= 30) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-100">
      {dias}d
    </span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-600 border border-green-100">
      {dias}d
    </span>
  );
}

function badgeUnidade(unidade: string) {
  const colors: Record<string, string> = {
    M: 'bg-blue-50 text-blue-700 border-blue-200',
    'M²': 'bg-sky-50 text-sky-700 border-sky-200',
    'M³': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    KG: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    T: 'bg-teal-50 text-teal-700 border-teal-200',
    PÇ: 'bg-slate-100 text-slate-600 border-slate-200',
    UN: 'bg-slate-100 text-slate-600 border-slate-200',
    CX: 'bg-amber-50 text-amber-700 border-amber-200',
    RL: 'bg-purple-50 text-purple-700 border-purple-200',
    GL: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    BR: 'bg-orange-50 text-orange-700 border-orange-200',
    VB: 'bg-pink-50 text-pink-700 border-pink-200',
    L: 'bg-lime-50 text-lime-700 border-lime-200',
    H: 'bg-violet-50 text-violet-700 border-violet-200',
    D: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colors[unidade] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
      title={UNIDADE_LABELS[unidade] || unidade}
    >
      {unidade}
    </span>
  );
}

/* ═══════════════════ Card KPI ═══════════════════ */

function CardKPI({ icon: Icon, iconBg, iconColor, label, value, valueColor = 'text-slate-800', subtitle, onClick, active }: {
  icon: typeof Package; iconBg: string; iconColor: string;
  label: string; value: string | number; valueColor?: string; subtitle?: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3 transition-all ${onClick ? 'cursor-pointer hover:shadow-md' : ''} ${active ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80'}`}
    >
      <div className={`${iconBg} rounded-xl p-2.5 shrink-0`}>
        <Icon size={20} className={iconColor} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">{label}</p>
        <p className={`text-xl font-bold ${valueColor} leading-tight mt-0.5`}>{value}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════ Ícone de Ordenação ═══════════════════ */

type ColunaOrdem = 'descricao' | 'custo_atual' | 'dias_sem_atualizar' | 'fornecedor';

function IconeOrdem({ coluna, atual, dir }: { coluna: ColunaOrdem; atual: ColunaOrdem; dir: 'asc' | 'desc' }) {
  if (coluna !== atual) return <ArrowUpDown size={11} className="text-slate-300 ml-1" />;
  return dir === 'asc'
    ? <ArrowUp size={11} className="text-blue-500 ml-1" />
    : <ArrowDown size={11} className="text-blue-500 ml-1" />;
}

/* ═══════════════════ Modal Histórico ═══════════════════ */

function ModalHistorico({ insumo, onFechar }: { insumo: Insumo; onFechar: () => void }) {
  const [historico, setHistorico] = useState<InsumoHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insumosRepository.listarHistorico(insumo.id).then(setHistorico).finally(() => setLoading(false));
  }, [insumo.id]);

  const variacao = useMemo(() => {
    if (historico.length < 2) return null;
    const ultimo = historico[0]?.custo ?? 0;
    const anterior = historico[1]?.custo ?? 0;
    if (anterior === 0) return null;
    return ((ultimo - anterior) / anterior) * 100;
  }, [historico]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 mr-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 rounded-lg p-1.5"><History size={15} /></div>
                <span className="text-sm font-medium text-blue-100">Histórico de Preços</span>
              </div>
              <h3 className="font-bold text-lg leading-snug line-clamp-2">{insumo.descricao}</h3>
              {insumo.fornecedor && (
                <p className="text-blue-200 text-sm mt-1 flex items-center gap-1.5">
                  <Truck size={13} /> {insumo.fornecedor}
                </p>
              )}
              {insumo.grupo && (
                <p className="text-blue-200 text-xs mt-0.5 flex items-center gap-1.5">
                  <Layers size={12} /> {insumo.grupo}
                </p>
              )}
            </div>
            <button onClick={onFechar} className="bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-400 font-semibold">Custo Atual</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{FMT_BRL.format(insumo.custo_atual)}</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-400 font-semibold">Unidade</p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{insumo.unidade}</p>
            <p className="text-[10px] text-slate-400">{UNIDADE_LABELS[insumo.unidade] || ''}</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-400 font-semibold">Variação</p>
            {variacao !== null ? (
              <p className={`text-base font-bold mt-0.5 flex items-center gap-1 ${variacao > 0 ? 'text-red-600' : variacao < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                {variacao > 0 ? <TrendingUp size={14} /> : variacao < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                {variacao > 0 ? '+' : ''}{variacao.toFixed(1)}%
              </p>
            ) : <p className="text-base font-bold text-slate-300 mt-0.5">—</p>}
            <p className="text-[10px] text-slate-400">{historico.length} registro{historico.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="overflow-auto max-h-[45vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600" />
              <p className="text-sm text-slate-400">Carregando histórico...</p>
            </div>
          ) : historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="bg-slate-100 rounded-2xl p-4"><History size={28} className="text-slate-300" /></div>
              <p className="text-slate-500 font-medium">Sem registros</p>
              <p className="text-xs text-slate-400">Nenhuma cotação anterior encontrada.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase">Data</th>
                  <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase">Custo</th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase">Fornecedor</th>
                  <th className="text-center px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase">Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historico.map((h, idx) => {
                  const anterior = historico[idx + 1]?.custo;
                  let varNode: React.ReactNode = <span className="text-slate-300">—</span>;
                  if (anterior && anterior > 0) {
                    const pct = ((h.custo - anterior) / anterior) * 100;
                    const cls = pct > 0 ? 'text-red-600 bg-red-50' : pct < 0 ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-50';
                    varNode = (
                      <span className={`${cls} px-2 py-0.5 rounded-md text-xs font-semibold`}>
                        {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                      </span>
                    );
                  }
                  return (
                    <tr key={h.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-2.5 text-sm text-slate-700 font-medium">
                        {h.data_cotacao ? FMT_DATE.format(new Date(h.data_cotacao)) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-sm text-slate-800 font-bold text-right tabular-nums">
                        {FMT_BRL.format(h.custo)}
                      </td>
                      <td className="px-5 py-2.5 text-sm text-slate-500">{h.fornecedor || '—'}</td>
                      <td className="px-5 py-2.5 text-center">{varNode}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ Página Principal ═══════════════════ */

const POR_PAGINA = 50;

export function Insumos() {
  const [visao, setVisao] = useState<'tabela' | 'catalogo'>('tabela');

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [ordemCol, setOrdemCol] = useState<ColunaOrdem>('descricao');
  const [ordemDir, setOrdemDir] = useState<'asc' | 'desc'>('asc');

  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [insumoHistorico, setInsumoHistorico] = useState<Insumo | null>(null);
  const [resumo, setResumo] = useState({ total: 0, alertas90: 0, alertas180: 0, fornecedores: 0 });
  const [filtroAlertaAtivo, setFiltroAlertaAtivo] = useState('');

  // Debounce busca 300ms
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const filtros: FiltrosInsumos = {
        ordenarPor: ordemCol,
        ordem: ordemDir,
      };
      if (buscaDebounced) filtros.busca = buscaDebounced;
      if (filtroFornecedor) filtros.fornecedor = filtroFornecedor;
      if (filtroUnidade) filtros.unidade = filtroUnidade;
      if (filtroGrupo) filtros.grupo = filtroGrupo;
      if (filtroAlertaAtivo) filtros.alertaDias = Number(filtroAlertaAtivo);

      const result = await insumosRepository.listar(pagina, filtros);
      setInsumos(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error('Erro ao carregar insumos:', err);
    } finally {
      setLoading(false);
    }
  }, [pagina, buscaDebounced, filtroFornecedor, filtroUnidade, filtroGrupo, filtroAlertaAtivo, ordemCol, ordemDir]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    insumosRepository.listarFornecedores().then((f) => {
      setFornecedores(f);
      setResumo((prev) => ({ ...prev, fornecedores: f.length }));
    }).catch(console.error);
    insumosRepository.listarUnidades().then(setUnidades).catch(console.error);
    insumosRepository.listarGrupos().then(setGrupos).catch(console.error);
    Promise.all([
      insumosRepository.listar(0, {}),
      insumosRepository.listar(0, { alertaDias: 90 }),
      insumosRepository.listar(0, { alertaDias: 180 }),
    ]).then(([all, a90, a180]) => {
      setResumo((prev) => ({ ...prev, total: all.total, alertas90: a90.total, alertas180: a180.total }));
    }).catch(console.error);
  }, []);

  useEffect(() => { setPagina(0); }, [buscaDebounced, filtroFornecedor, filtroUnidade, filtroGrupo, filtroAlertaAtivo, ordemCol, ordemDir]);

  function toggleOrdem(col: ColunaOrdem) {
    if (ordemCol === col) {
      setOrdemDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdemCol(col);
      setOrdemDir('asc');
    }
  }

  function ativarFiltroAlerta(val: string) {
    setFiltroAlertaAtivo(val);
    setFiltrosAbertos(true);
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const filtrosAtivos = [filtroFornecedor, filtroUnidade, filtroGrupo, filtroAlertaAtivo].filter(Boolean).length;
  const inicio = total === 0 ? 0 : pagina * POR_PAGINA + 1;
  const fim = Math.min((pagina + 1) * POR_PAGINA, total);

  return (
    <div className="space-y-4 pb-8">
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 shadow-lg shadow-blue-500/20">
          <Package size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 leading-tight">Catálogo de Insumos</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {resumo.total.toLocaleString('pt-BR')} materiais · {resumo.fornecedores} fornecedores · {grupos.length} grupos
          </p>
        </div>
        {/* Toggle Tabela / Catálogo */}
        <div className="ml-auto flex gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => setVisao('tabela')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              visao === 'tabela'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TableProperties size={13} /> Tabela
          </button>
          <button
            onClick={() => setVisao('catalogo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              visao === 'catalogo'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FolderTree size={13} /> Catálogo
          </button>
        </div>
      </div>

      {/* ═══ Visão: Tabela ou Catálogo ═══ */}
      {visao === 'catalogo' ? (
        <CatalogoArvore />
      ) : <>

      {/* ═══ Cards KPI — clicáveis para filtrar ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardKPI
          icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600"
          label="Total de Insumos" value={resumo.total.toLocaleString('pt-BR')}
          subtitle={`${resumo.fornecedores} fornecedores`}
        />
        <CardKPI
          icon={Truck} iconBg="bg-indigo-50" iconColor="text-indigo-600"
          label="Fornecedores" value={resumo.fornecedores} valueColor="text-indigo-700"
          subtitle={`${grupos.length} grupos`}
        />
        <CardKPI
          icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500"
          label="+90 dias sem preço" value={resumo.alertas90.toLocaleString('pt-BR')}
          valueColor="text-amber-600" subtitle="Clique para filtrar"
          onClick={() => ativarFiltroAlerta(filtroAlertaAtivo === '90' ? '' : '90')}
          active={filtroAlertaAtivo === '90'}
        />
        <CardKPI
          icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500"
          label="+180 dias sem preço" value={resumo.alertas180.toLocaleString('pt-BR')}
          valueColor="text-red-600" subtitle="Clique para filtrar"
          onClick={() => ativarFiltroAlerta(filtroAlertaAtivo === '180' ? '' : '180')}
          active={filtroAlertaAtivo === '180'}
        />
      </div>

      {/* ═══ Barra de Busca + Filtros ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por descrição, código, fornecedor ou grupo..."
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-300 transition-all placeholder:text-slate-400"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all shrink-0 ${
              filtrosAtivos > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Filter size={14} />
            Filtros
            {filtrosAtivos > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {filtrosAtivos}
              </span>
            )}
            <ChevronDown size={13} className={`transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 shrink-0 pl-2.5 border-l border-slate-200">
            <BarChart3 size={12} />
            <span className="font-medium text-slate-600">{total.toLocaleString('pt-BR')}</span> item{total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Filtros expandíveis */}
        {filtrosAbertos && (
          <div className="px-3 pb-3 border-t border-slate-100">
            <div className="pt-3 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Fornecedor */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 mb-1">
                  <Truck size={10} /> Fornecedor
                </label>
                <select
                  value={filtroFornecedor}
                  onChange={(e) => setFiltroFornecedor(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                >
                  <option value="">Todos ({fornecedores.length})</option>
                  {fornecedores.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Grupo */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 mb-1">
                  <Layers size={10} /> Grupo
                </label>
                <select
                  value={filtroGrupo}
                  onChange={(e) => setFiltroGrupo(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                >
                  <option value="">Todos ({grupos.length})</option>
                  {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Unidade */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 mb-1">
                  <Ruler size={10} /> Unidade
                </label>
                <select
                  value={filtroUnidade}
                  onChange={(e) => setFiltroUnidade(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                >
                  <option value="">Todas</option>
                  {unidades.map((u) => <option key={u} value={u}>{u}{UNIDADE_LABELS[u] ? ` — ${UNIDADE_LABELS[u]}` : ''}</option>)}
                </select>
              </div>

              {/* Alerta */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1 mb-1">
                  <AlertTriangle size={10} /> Desatualizado há
                </label>
                <select
                  value={filtroAlertaAtivo}
                  onChange={(e) => setFiltroAlertaAtivo(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                >
                  <option value="">Qualquer período</option>
                  <option value="30">+30 dias</option>
                  <option value="90">+90 dias</option>
                  <option value="180">+180 dias</option>
                  <option value="365">+1 ano</option>
                </select>
              </div>
            </div>

            {filtrosAtivos > 0 && (
              <div className="mt-2.5 flex justify-end">
                <button
                  onClick={() => { setFiltroFornecedor(''); setFiltroUnidade(''); setFiltroGrupo(''); setFiltroAlertaAtivo(''); }}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <RotateCcw size={11} /> Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Tabela ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-100 border-t-blue-600" />
            <p className="text-sm text-slate-400">Carregando insumos...</p>
          </div>
        ) : insumos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-slate-100 rounded-2xl p-5 mb-4">
              <Package size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold mb-1">Nenhum insumo encontrado</p>
            <p className="text-sm text-slate-400 max-w-xs text-center">Tente ajustar os filtros ou a busca.</p>
            {filtrosAtivos > 0 && (
              <button
                onClick={() => { setFiltroFornecedor(''); setFiltroUnidade(''); setFiltroGrupo(''); setFiltroAlertaAtivo(''); setBusca(''); }}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left pl-4 pr-2 py-3 w-[35%]">
                      <button onClick={() => toggleOrdem('descricao')} className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors">
                        <Hash size={11} /> Descrição <IconeOrdem coluna="descricao" atual={ordemCol} dir={ordemDir} />
                      </button>
                    </th>
                    <th className="text-left px-2 py-3">
                      <button onClick={() => toggleOrdem('fornecedor')} className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors">
                        <Truck size={11} /> Fornecedor <IconeOrdem coluna="fornecedor" atual={ordemCol} dir={ordemDir} />
                      </button>
                    </th>
                    <th className="text-left px-2 py-3 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <Layers size={11} /> Grupo
                      </span>
                    </th>
                    <th className="text-center px-2 py-3 w-14">
                      <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 uppercase">
                        <Ruler size={11} /> Un.
                      </span>
                    </th>
                    <th className="text-right px-2 py-3 w-32">
                      <button onClick={() => toggleOrdem('custo_atual')} className="flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors w-full">
                        <CircleDollarSign size={11} /> Custo <IconeOrdem coluna="custo_atual" atual={ordemCol} dir={ordemDir} />
                      </button>
                    </th>
                    <th className="text-center px-2 py-3 w-28 hidden md:table-cell">
                      <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 uppercase">
                        <CalendarDays size={11} /> Atualiz.
                      </span>
                    </th>
                    <th className="text-center px-2 py-3 w-24">
                      <button onClick={() => toggleOrdem('dias_sem_atualizar')} className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors w-full">
                        Status <IconeOrdem coluna="dias_sem_atualizar" atual={ordemCol} dir={ordemDir} />
                      </button>
                    </th>
                    <th className="text-center pr-4 pl-2 py-3 w-12">
                      <History size={12} className="mx-auto text-slate-400" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {insumos.map((ins) => (
                    <tr key={ins.id} className="group hover:bg-blue-50/30 transition-colors">
                      <td className="pl-4 pr-2 py-3">
                        <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors">
                          {ins.descricao}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{ins.codigo}</p>
                      </td>
                      <td className="px-2 py-3">
                        <span className="text-sm text-slate-600 line-clamp-1">{ins.fornecedor || <span className="text-slate-300">—</span>}</span>
                      </td>
                      <td className="px-2 py-3 hidden lg:table-cell">
                        {ins.grupo ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 line-clamp-1">
                            {ins.grupo}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {badgeUnidade(ins.unidade)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <span className="text-sm font-bold text-slate-800 tabular-nums">
                          {FMT_BRL.format(ins.custo_atual)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center hidden md:table-cell">
                        <span className="text-xs text-slate-500">
                          {ins.data_ultimo_preco ? FMT_DATE.format(new Date(ins.data_ultimo_preco)) : <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        {badgeAlerta(ins.dias_sem_atualizar)}
                      </td>
                      <td className="pr-4 pl-2 py-3 text-center">
                        <button
                          onClick={() => setInsumoHistorico(ins)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-all"
                          title="Ver histórico de preços"
                        >
                          <History size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                {total === 0 ? 'Nenhum resultado' : (
                  <>Mostrando <span className="font-semibold text-slate-700">{inicio}–{fim}</span> de <span className="font-semibold text-slate-700">{total.toLocaleString('pt-BR')}</span></>
                )}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPagina(0)}
                  disabled={pagina === 0}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Primeira
                </button>
                <button
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                  className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200 bg-white"
                >
                  <ChevronLeft size={15} className="text-slate-600" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pg: number;
                    if (totalPaginas <= 5) pg = i;
                    else if (pagina < 3) pg = i;
                    else if (pagina > totalPaginas - 4) pg = totalPaginas - 5 + i;
                    else pg = pagina - 2 + i;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPagina(pg)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-all ${
                          pg === pagina ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pg + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={pagina >= totalPaginas - 1}
                  className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200 bg-white"
                >
                  <ChevronRight size={15} className="text-slate-600" />
                </button>
                <button
                  onClick={() => setPagina(totalPaginas - 1)}
                  disabled={pagina >= totalPaginas - 1}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Última
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      </> /* end visao === 'tabela' */}

      {insumoHistorico && (
        <ModalHistorico insumo={insumoHistorico} onFechar={() => setInsumoHistorico(null)} />
      )}
    </div>
  );
}
