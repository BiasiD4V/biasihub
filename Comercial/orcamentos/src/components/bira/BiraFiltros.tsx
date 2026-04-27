import {
  Search, RefreshCw, LayoutGrid, List, XCircle, Plus, Bug,
} from 'lucide-react';

export function BiraFiltros({
  busca, setBusca, filtroTipo, setFiltroTipo,
  filtroResponsavel, setFiltroResponsavel, aba, setAba,
  allTipos, responsaveis, stats, lastSync, syncing,
  onRefresh, onShowCreate,
}: any) {
  return (
    <div className="bg-white/50 backdrop-blur-xl border-b border-slate-200/60 pb-1 no-scrollbar">
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Bira</h1>
            <div className="flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-0.5 rounded-lg shadow-lg shadow-blue-600/20">
              <span className="text-[10px] font-black tracking-widest uppercase">Native</span>
            </div>
            {lastSync && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">
                <div className={`w-1.5 h-1.5 rounded-full ${syncing ? 'bg-blue-500 animate-pulse' : 'bg-green-500 opacity-50'}`} />
                {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-400">Gerenciamento de tarefas comerciais e orçamentos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onRefresh} disabled={syncing} className={`p-3 text-slate-400 hover:text-blue-600 rounded-2xl transition-all ${syncing ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>
          <button onClick={onShowCreate} className="group flex items-center gap-2.5 px-6 py-3.5 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-[20px] transition-all shadow-xl shadow-blue-600/30">
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Criar Tarefa
          </button>
        </div>
      </div>

      <div className="px-6 mb-6 flex gap-3 overflow-x-auto no-scrollbar py-1">
        {[
          { label: 'Total', value: stats.total, cls: 'bg-white border-slate-100 text-slate-800' },
          { label: 'Ideia', value: stats.ideia, cls: 'bg-white border-slate-100 text-slate-500' },
          { label: 'A Fazer', value: stats.afazer, cls: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
          { label: 'Em Andamento', value: stats.andamento, cls: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: 'Em Análise', value: stats.analise, cls: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: 'Concluído', value: stats.concluido, cls: 'bg-green-50 text-green-700 border-green-100' },
        ].map(s => (
          <div key={s.label} className={`px-5 py-3 rounded-2xl border shadow-sm min-w-[120px] transition-all ${s.cls}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{s.label}</p>
            <p className="text-xl font-black">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-6 flex items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-1 bg-slate-200/30 p-1 rounded-2xl border border-slate-200/50">
          {[
            { id: 'quadro', label: 'Quadro', Icon: LayoutGrid },
            { id: 'lista', label: 'Lista', Icon: List },
            { id: 'registro', label: 'Registro', Icon: Bug },
          ].map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setAba(id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${aba === id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <Icon size={14} /> <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 w-64 shadow-sm transition-all">
            <Search size={16} className="text-slate-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar..." className="bg-transparent text-sm font-semibold outline-none w-full" />
            {busca && <button onClick={() => setBusca('')} className="text-slate-300 hover:text-slate-500"><XCircle size={14} /></button>}
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none shadow-sm cursor-pointer">
            <option value="">Tipos</option>
            {allTipos.map((t: any) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none shadow-sm cursor-pointer">
            <option value="">Responsáveis</option>
            {responsaveis.map((r: any) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
