import { useEffect, useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { JiraIssue, JiraComment, JiraIssueDetail } from '../components/bira/biraTypes';
import { TRANSITIONS } from '../components/bira/biraTypes';
import { BiraFiltros } from '../components/bira/BiraFiltros';
import { BiraTabela } from '../components/bira/BiraTabela';
import { IssuePanel, CreateIssueModal } from '../components/bira/BiraFormulario';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { fetchAutenticado } from '../utils/fetchAutenticado';

export function Bira() {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Panel
  const [panelIssue, setPanelIssue] = useState<JiraIssue | null>(null);
  const [panelDetail, setPanelDetail] = useState<JiraIssueDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);

  // Filters
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [aba, setAba] = useState<'quadro' | 'lista' | 'calendario' | 'cronograma'>('quadro');
  const [sortField] = useState<keyof JiraIssue>('created');
  const [sortDir] = useState<'asc' | 'desc'>('desc');

  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    load();
    const interval = setInterval(() => silentLoad(), 45_000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAutenticado('/api/jira');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Erro ${res.status}`);
        setLoading(false);
        return;
      }
      setIssues(await res.json());
      setLastSync(new Date());
    } catch {
      setError('Erro de conexão');
    }
    setLoading(false);
  }

  async function silentLoad() {
    setSyncing(true);
    try {
      const res = await fetchAutenticado('/api/jira');
      if (res.ok) {
        setIssues(await res.json());
        setLastSync(new Date());
      }
    } catch {}
    setSyncing(false);
  }

  async function openPanel(issue: JiraIssue) {
    setPanelIssue(issue);
    setPanelDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetchAutenticado(`/api/jira-issue?key=${issue.key}`);
      if (res.ok) setPanelDetail(await res.json());
    } catch {}
    setLoadingDetail(false);
  }

  function closePanel() {
    setPanelIssue(null);
    setPanelDetail(null);
  }

  function handleStatusChange(key: string, t: typeof TRANSITIONS[0]) {
    setIssues(prev => prev.map(i => i.key === key ? { ...i, status: t.name } : i));
    if (panelIssue?.key === key) {
      setPanelIssue(prev => prev ? { ...prev, status: t.name } : prev);
      setPanelDetail(prev => prev ? { ...prev, status: t.name } : prev);
    }
  }

  function handleCommentAdded(_key: string, comment: JiraComment) {
    setPanelDetail(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
  }

  function handleDuedateChange(key: string, newDate: string | null) {
    setIssues(prev => prev.map(i => i.key === key ? { ...i, duedate: newDate } : i));
    fetch('/api/jira-update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, fields: { duedate: newDate } }),
    });
  }

  async function handleCreated(newKey: string) {
    setShowCreate(false);
    await load();
    const found = issues.find(i => i.key === newKey);
    if (found) openPanel(found);
  }

  const allStatuses = useMemo(() => {
    const s = new Set<string>();
    issues.forEach(i => { if (i.status) s.add(i.status); });
    return Array.from(s).sort();
  }, [issues]);

  const allTipos = useMemo(() => {
    const s = new Set<string>();
    issues.forEach(i => { if (i.issuetype) s.add(i.issuetype); });
    return Array.from(s).sort();
  }, [issues]);

  const responsaveis = useMemo(() => {
    const s = new Set<string>();
    issues.forEach(i => { if (i.assigneeName) s.add(i.assigneeName); });
    return Array.from(s).sort();
  }, [issues]);

  const filtrados = useMemo(() => {
    const arr = issues.filter(i => {
      if (filtroStatus && i.status !== filtroStatus) return false;
      if (filtroTipo && i.issuetype !== filtroTipo) return false;
      if (filtroResponsavel && i.assigneeName !== filtroResponsavel) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!i.key.toLowerCase().includes(q) && !i.summary.toLowerCase().includes(q) &&
          !(i.assigneeName?.toLowerCase().includes(q)) && !(i.parentSummary?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
    return [...arr].sort((a, b) => {
      const va = String(a[sortField] ?? ''), vb = String(b[sortField] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb, 'pt-BR') : vb.localeCompare(va, 'pt-BR');
    });
  }, [issues, busca, filtroStatus, filtroTipo, filtroResponsavel, sortField, sortDir]);

  const stats = useMemo(() => ({
    total: issues.length,
    ideia: issues.filter(i => i.status === 'Ideia').length,
    afazer: issues.filter(i => i.status === 'A fazer').length,
    andamento: issues.filter(i => i.status === 'Em andamento').length,
    analise: issues.filter(i => i.status === 'Em análise').length,
    concluido: issues.filter(i => i.status === 'Concluído').length,
  }), [issues]);

  if (loading) return <LoadingSpinner />;

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <ErrorAlert mensagem={error} />
      <button onClick={load} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">
        <RefreshCw size={13} className="inline mr-1" /> Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <BiraFiltros
        issues={issues}
        filtrados={filtrados}
        busca={busca}
        setBusca={setBusca}
        filtroStatus={filtroStatus}
        setFiltroStatus={setFiltroStatus}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
        filtroResponsavel={filtroResponsavel}
        setFiltroResponsavel={setFiltroResponsavel}
        aba={aba}
        setAba={setAba}
        allStatuses={allStatuses}
        allTipos={allTipos}
        responsaveis={responsaveis}
        stats={stats}
        lastSync={lastSync}
        syncing={syncing}
        onRefresh={load}
        onShowCreate={() => setShowCreate(true)}
      />

      <BiraTabela
        filtrados={filtrados}
        aba={aba}
        onOpenPanel={openPanel}
        onStatusChange={handleStatusChange}
        onDuedateChange={handleDuedateChange}
        onShowCreate={() => setShowCreate(true)}
      />

      {panelIssue && (
        <IssuePanel
          issue={panelIssue}
          detail={panelDetail}
          loadingDetail={loadingDetail}
          onClose={closePanel}
          onStatusChange={handleStatusChange}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {showCreate && (
        <CreateIssueModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  );
}
