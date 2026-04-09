import { useState, useEffect, useMemo } from 'react';
import { BiraFiltros } from '../components/bira/BiraFiltros';
import { BiraTabela } from '../components/bira/BiraTabela';
import { IssuePanel, CreateIssueModal } from '../components/bira/BiraFormulario';
import { biraRepository } from '../infrastructure/supabase/biraRepository';
import type { JiraIssue, JiraIssueDetail } from '../components/bira/biraTypes';

export function Bira() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [aba, setAba] = useState<'quadro' | 'lista' | 'calendario' | 'cronograma'>('quadro');

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
    } catch (err) {
      console.error('Erro ao carregar Bira:', err);
    }
    setLoading(false);
    setSyncing(false);
  };

  useEffect(() => {
    carregar();
    const sub = biraRepository.subscribe(() => carregar(true));
    return () => { sub.unsubscribe(); };
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

      <BiraTabela
        filtrados={filtrados}
        aba={aba}
        onOpenPanel={setSelectedIssue}
        onStatusChange={(id, t) => {
          setIssues(prev => prev.map(i => i.id === id ? { ...i, status: t.id as any, atualizado_em: new Date().toISOString() } : i));
        }}
      />

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
