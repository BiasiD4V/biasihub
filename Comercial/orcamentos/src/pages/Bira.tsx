import { useState, useEffect, useMemo } from 'react';
import { BiraFiltros } from '../components/bira/BiraFiltros';
import { BiraTabela } from '../components/bira/BiraTabela';
import { IssuePanel, CreateIssueModal } from '../components/bira/BiraFormulario';
import { BugRegistro } from '../components/bira/BugRegistro';
import { biraRepository } from '../infrastructure/supabase/biraRepository';
import type { JiraIssue, JiraIssueDetail } from '../components/bira/biraTypes';

export function Bira() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [aba, setAba] = useState<'quadro' | 'lista' | 'calendario' | 'cronograma' | 'registro'>('quadro');

  // Painéis
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<JiraIssueDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const carregar = async (silent = false) => {
    if (!silent) setLoading(true);
    setSyncing(true);
    try {
      const data = await biraRepository.listarTodas();
      setIssues(data);
      setLastSync(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar Bira:', err);
      setError(err.message || 'Erro de conexão com o Banco de Dados.');
    }
    setLoading(false);
    setSyncing(false);
  };

  useEffect(() => {
    carregar();
    let sub: any;
    try {
      sub = biraRepository.subscribe(() => carregar(true));
    } catch (err) {
      console.error('Erro ao assinar Realtime:', err);
    }
    return () => { 
      if (sub && typeof sub.unsubscribe === 'function') {
        try { sub.unsubscribe(); } catch (e) { console.error(e); }
      }
    };
  }, []);

  useEffect(() => {
    if (selectedIssue) {
      setLoadingDetail(true);
      biraRepository.buscarDetalhe(selectedIssue.id)
        .then(setDetail)
        .catch(console.error)
        .finally(() => setLoadingDetail(false));
    } else {
      setDetail(null);
    }
  }, [selectedIssue]);

  const filtrados = useMemo(() => {
    return issues.filter(i => {
      const matchesBusca = !busca || i.titulo.toLowerCase().includes(busca.toLowerCase()) || i.codigo.toLowerCase().includes(busca.toLowerCase());
      const matchesTipo = !filtroTipo || i.tipo === filtroTipo;
      const matchesReponsavel = !filtroResponsavel || i.responsavel_nome === filtroResponsavel;
      return matchesBusca && matchesTipo && matchesReponsavel;
    });
  }, [issues, busca, filtroTipo, filtroResponsavel]);

  const allTipos = useMemo(() => Array.from(new Set(issues.map(i => i.tipo))).sort(), [issues]);
  const responsaveis = useMemo(() => Array.from(new Set(issues.map(i => i.responsavel_nome).filter(Boolean))).sort(), [issues]);

  const stats = useMemo(() => ({
    total: issues.length,
    ideia: issues.filter(i => i.status === 'ideia').length,
    afazer: issues.filter(i => i.status === 'a_fazer').length,
    andamento: issues.filter(i => i.status === 'em_andamento').length,
    analise: issues.filter(i => i.status === 'em_analise').length,
    concluido: issues.filter(i => i.status === 'concluido').length,
  }), [issues]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      <BiraFiltros
        filtrados={filtrados}
        busca={busca} setBusca={setBusca}
        filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo}
        filtroResponsavel={filtroResponsavel} setFiltroResponsavel={setFiltroResponsavel}
        aba={aba} setAba={setAba}
        allTipos={allTipos} responsaveis={responsaveis}
        stats={stats}
        lastSync={lastSync} syncing={syncing}
        onRefresh={() => carregar()}
        onShowCreate={() => setShowCreate(true)}
      />

      {loading && (
        <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative"><div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" /><div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-blue-600 uppercase">Bira</div></div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Sincronizando tarefas...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-2xl border border-rose-100 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 className="text-xl font-black text-slate-800">Erro de Carregamento</h3>
            <p className="text-sm font-semibold text-slate-700 leading-relaxed">{error}</p>
            <button 
              onClick={() => carregar()}
              className="mt-4 px-8 py-3.5 bg-blue-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {aba !== 'registro' && (
        <BiraTabela
          filtrados={filtrados}
          aba={aba}
          onOpenPanel={setSelectedIssue}
          onStatusChange={(id, t) => {
            setIssues(prev => prev.map(i => i.id === id ? { ...i, status: t.id as any, atualizado_em: new Date().toISOString() } : i));
          }}
        />
      )}

      {aba === 'registro' && (
        <BugRegistro bugs={issues.filter(i => i.tipo === 'bug')} />
      )}

      {selectedIssue && (
        <IssuePanel
          issue={selectedIssue}
          detail={detail}
          loadingDetail={loadingDetail}
          onClose={() => setSelectedIssue(null)}
          onStatusChange={(id, t) => {
            setIssues(prev => prev.map(i => i.id === id ? { ...i, status: t.id as any, atualizado_em: new Date().toISOString() } : i));
          }}
          onCommentAdded={(id, c) => {
            if (detail && detail.id === id) setDetail({ ...detail, comentarios: [...detail.comentarios, c] });
          }}
          onDeleted={(id) => {
            setIssues(prev => prev.filter(i => i.id !== id));
            setSelectedIssue(null);
          }}
        />
      )}

      {showCreate && (
        <CreateIssueModal
          onClose={() => setShowCreate(false)}
          onCreate={() => {
            setShowCreate(false);
            carregar(true);
            // Opcionalmente abrir o painel da nova tarefa
          }}
        />
      )}
    </div>
  );
}
