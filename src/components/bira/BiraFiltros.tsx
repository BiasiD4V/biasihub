import {
  Search, RefreshCw, LayoutGrid, List, XCircle, Plus,
  Calendar, GanttChart,
} from 'lucide-react';
import type { JiraIssue } from './biraTypes';

// ── Props ─────────────────────────────────────────────────────────────────────
export interface BiraFiltrosProps {
  issues: JiraIssue[];
  filtrados: JiraIssue[];
  busca: string;
  setBusca: (v: string) => void;
  filtroStatus: string;
  setFiltroStatus: (v: string) => void;
  filtroTipo: string;
  setFiltroTipo: (v: string) => void;
  filtroResponsavel: string;
  setFiltroResponsavel: (v: string) => void;
  aba: 'quadro' | 'lista' | 'calendario' | 'cronograma';
  setAba: (v: 'quadro' | 'lista' | 'calendario' | 'cronograma') => void;
  allStatuses: string[];
  allTipos: string[];
  responsaveis: string[];
  stats: {
    total: number;
    ideia: number;
    afazer: number;
    andamento: number;
    analise: number;
    concluido: number;
  };
  lastSync: Date | null;
  syncing: boolean;
  onRefresh: () => void;
  onShowCreate: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BiraFiltros({
  filtrados,
  busca, setBusca,
  filtroStatus, setFiltroStatus,
  filtroTipo, setFiltroTipo,
  filtroResponsavel, setFiltroResponsavel,
  aba, setAba,
  allTipos, responsaveis,
  stats,
  lastSync, syncing,
  onRefresh, onShowCreate,
}: BiraFiltrosProps) {
  return (
    <>
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-800">Tarefas</h1>
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">ORC</span>
              {lastSync && (
                <span className="hidden sm:flex text-[10px] text-slate-400 items-center gap-1">
                  {syncing && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                  Sync {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5">biasiengenharia-comercial.atlassian.net</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={onRefresh} className={`p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors ${syncing ? 'animate-pulse' : ''}`} title="Atualizar">
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onShowCreate}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Criar</span>
            </button>
          </div>
        </div>

        {/* Stats — scrollável no mobile */}
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { label: 'Total', value: stats.total, cls: 'bg-slate-50 border-slate-200 text-slate-700' },
            { label: 'Ideia', value: stats.ideia, cls: 'bg-slate-50 border-slate-200 text-slate-600' },
            { label: 'A Fazer', value: stats.afazer, cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { label: 'Andamento', value: stats.andamento, cls: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Análise', value: stats.analise, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            { label: 'Concluído', value: stats.concluido, cls: 'bg-green-50 border-green-200 text-green-700' },
          ].map(s => (
            <div key={s.label} className={`border rounded-xl px-2.5 py-1.5 flex-shrink-0 ${s.cls}`}>
              <p className="text-[9px] sm:text-[10px] opacity-70 whitespace-nowrap">{s.label}</p>
              <p className="text-base sm:text-lg font-bold leading-none">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs — scrollável no mobile */}
        <div className="flex items-center gap-1 sm:gap-4 border-b border-slate-200 -mb-[13px] sm:-mb-[17px] overflow-x-auto no-scrollbar">
          {([['quadro', 'Quadro', LayoutGrid], ['lista', 'Lista', List], ['calendario', 'Calendário', Calendar], ['cronograma', 'Cronograma', GanttChart]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`flex items-center gap-1 sm:gap-1.5 pb-2.5 sm:pb-3 px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${aba === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 sm:px-6 sm:py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5 flex-1 min-w-[140px]">
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar..." className="bg-transparent text-sm flex-1 outline-none placeholder:text-slate-400 min-w-0" />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 text-slate-600 bg-white">
            <option value="">Todos os tipos</option>
            {allTipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)}
            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 text-slate-600 bg-white">
            <option value="">Todos responsáveis</option>
            {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {(busca || filtroStatus || filtroTipo || filtroResponsavel) && (
            <button onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroTipo(''); setFiltroResponsavel(''); }}
              className="p-1.5 text-slate-400 hover:text-slate-600">
              <XCircle size={14} />
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{filtrados.length} issues</span>
        </div>
      </div>
    </>
  );
}
