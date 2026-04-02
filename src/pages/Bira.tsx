import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Search, RefreshCw, List, LayoutGrid, ArrowUpDown, XCircle, ExternalLink, Plus,
  X, ChevronDown, Send, Zap, BookOpen, Bug, CheckSquare, Star, Package, GitBranch,
  Clock, Tag, User, AlertCircle, MessageSquare,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  issuetype: string;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  priority: string;
  created: string | null;
  updated: string | null;
  duedate: string | null;
  parentKey: string | null;
  parentSummary: string | null;
  labels: string[];
  webUrl: string;
}

interface JiraComment {
  id: string;
  author: string;
  authorAvatar: string | null;
  body: string;
  created: string;
}

interface JiraIssueDetail extends JiraIssue {
  description: string;
  comments: JiraComment[];
}

// ── Constants ──────────────────────────────────────────────────────────────────
const TRANSITIONS: { id: string; name: string }[] = [
  { id: '11', name: 'Ideia' },
  { id: '21', name: 'A fazer' },
  { id: '31', name: 'Em andamento' },
  { id: '41', name: 'Em análise' },
  { id: '51', name: 'Concluído' },
];

const STATUS_CONFIG: Record<string, { cls: string; dot: string }> = {
  'Ideia':        { cls: 'bg-slate-100 text-slate-600 border border-slate-200',   dot: 'bg-slate-400' },
  'A fazer':      { cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200', dot: 'bg-yellow-400' },
  'Em andamento': { cls: 'bg-blue-100 text-blue-700 border border-blue-200',       dot: 'bg-blue-500' },
  'Em análise':   { cls: 'bg-amber-100 text-amber-700 border border-amber-200',    dot: 'bg-amber-500' },
  'Concluído':    { cls: 'bg-green-100 text-green-700 border border-green-200',    dot: 'bg-green-500' },
};
function statusCls(s: string) { return STATUS_CONFIG[s]?.cls ?? 'bg-slate-100 text-slate-500 border border-slate-200'; }
function statusDot(s: string) { return STATUS_CONFIG[s]?.dot ?? 'bg-slate-400'; }

const COLUNAS_QUADRO = [
  { status: 'Ideia',        titulo: 'IDEIA',        cor: 'border-slate-300 bg-slate-50/60',  badge: 'bg-slate-100 text-slate-600' },
  { status: 'A fazer',      titulo: 'A FAZER',      cor: 'border-yellow-300 bg-yellow-50/60', badge: 'bg-yellow-100 text-yellow-700' },
  { status: 'Em andamento', titulo: 'EM ANDAMENTO', cor: 'border-blue-300 bg-blue-50/60',     badge: 'bg-blue-100 text-blue-700' },
  { status: 'Em análise',   titulo: 'EM ANÁLISE',   cor: 'border-amber-300 bg-amber-50/60',   badge: 'bg-amber-100 text-amber-700' },
  { status: 'Concluído',    titulo: 'CONCLUÍDO',    cor: 'border-green-300 bg-green-50/60',   badge: 'bg-green-100 text-green-700' },
];

const PRIORITY_CLS: Record<string, string> = {
  Highest: 'text-red-600', High: 'text-orange-500', Medium: 'text-yellow-500',
  Low: 'text-blue-400', Lowest: 'text-slate-400',
};
const PRIORITY_ICON: Record<string, string> = {
  Highest: '↑↑', High: '↑', Medium: '–', Low: '↓', Lowest: '↓↓',
};

const ISSUE_TYPE_ICON: Record<string, React.ElementType> = {
  Epic: Zap, Feature: Star, Tarefa: CheckSquare, História: BookOpen,
  Bug: Bug, Recurso: Package, Subtask: GitBranch,
};

const ISSUE_TYPES_CREATE = [
  { id: '10003', name: 'Feature', icon: Star },
  { id: '10004', name: 'Tarefa', icon: CheckSquare },
  { id: '10005', name: 'História', icon: BookOpen },
  { id: '10006', name: 'Bug', icon: Bug },
  { id: '10007', name: 'Recurso', icon: Package },
];

const PRIORITIES_CREATE = [
  { id: '1', name: 'Highest' }, { id: '2', name: 'High' },
  { id: '3', name: 'Medium' }, { id: '4', name: 'Low' }, { id: '5', name: 'Lowest' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}
function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

// ── Status Dropdown ────────────────────────────────────────────────────────────
function StatusDropdown({ current, onSelect, disabled }: {
  current: string; onSelect: (t: typeof TRANSITIONS[0]) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-opacity ${statusCls(current)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(current)}`} />
        {current}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-44 py-1 overflow-hidden">
          {TRANSITIONS.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${t.name === current ? 'font-semibold' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(t.name)}`} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Issue Detail Panel ─────────────────────────────────────────────────────────
function IssuePanel({
  issue, detail, loadingDetail, onClose, onStatusChange, onCommentAdded,
}: {
  issue: JiraIssue;
  detail: JiraIssueDetail | null;
  loadingDetail: boolean;
  onClose: () => void;
  onStatusChange: (key: string, t: typeof TRANSITIONS[0]) => void;
  onCommentAdded: (key: string, comment: JiraComment) => void;
}) {
  const [changingStatus, setChangingStatus] = useState(false);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const TypeIcon = ISSUE_TYPE_ICON[issue.issuetype] || CheckSquare;

  async function handleStatusChange(t: typeof TRANSITIONS[0]) {
    setChangingStatus(true);
    try {
      const res = await fetch('/api/jira-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: issue.key, transitionId: t.id }),
      });
      if (res.ok) onStatusChange(issue.key, t);
    } catch {}
    setChangingStatus(false);
  }

  async function handleSendComment() {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch('/api/jira-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: issue.key, body: comment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onCommentAdded(issue.key, {
          id: data.id,
          author: 'Você',
          authorAvatar: null,
          body: comment.trim(),
          created: data.created || new Date().toISOString(),
        });
        setComment('');
      }
    } catch {}
    setSendingComment(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/20" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden border-l border-slate-200">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TypeIcon size={15} className="text-slate-400" />
            <span className="text-sm font-mono text-blue-600 font-bold">{issue.key}</span>
            {issue.parentKey && (
              <span className="text-xs text-slate-400">· {issue.parentKey}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a href={issue.webUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
              <ExternalLink size={13} />
              Abrir no Jira
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-4 pb-6 space-y-5">
            {/* Summary */}
            <h2 className="text-lg font-bold text-slate-800 leading-snug">{issue.summary}</h2>

            {/* Status + Priority */}
            <div className="flex items-center gap-3 flex-wrap">
              <StatusDropdown current={issue.status} onSelect={handleStatusChange} disabled={changingStatus} />
              <span className={`text-xs font-bold ${PRIORITY_CLS[issue.priority] ?? 'text-slate-400'}`}>
                {PRIORITY_ICON[issue.priority] ?? '–'} {issue.priority}
              </span>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 text-xs">
              <div>
                <p className="text-slate-400 mb-1 flex items-center gap-1"><User size={10} /> Responsável</p>
                {issue.assigneeName ? (
                  <div className="flex items-center gap-1.5">
                    {issue.assigneeAvatar
                      ? <img src={issue.assigneeAvatar} alt="" className="w-5 h-5 rounded-full" />
                      : <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center"><span className="text-[9px] text-white font-bold">{issue.assigneeName.charAt(0)}</span></div>
                    }
                    <span className="font-medium text-slate-700">{issue.assigneeName}</span>
                  </div>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div>
                <p className="text-slate-400 mb-1 flex items-center gap-1"><Tag size={10} /> Tipo</p>
                <span className="font-medium text-slate-700">{issue.issuetype}</span>
              </div>
              <div>
                <p className="text-slate-400 mb-1 flex items-center gap-1"><Clock size={10} /> Criado</p>
                <span className="text-slate-600">{formatDateTime(issue.created)}</span>
              </div>
              <div>
                <p className="text-slate-400 mb-1 flex items-center gap-1"><Clock size={10} /> Atualizado</p>
                <span className="text-slate-600">{timeAgo(issue.updated)}</span>
              </div>
              {issue.duedate && (
                <div>
                  <p className="text-slate-400 mb-1 flex items-center gap-1"><AlertCircle size={10} /> Prazo</p>
                  <span className="text-slate-600">{formatDate(issue.duedate)}</span>
                </div>
              )}
              {issue.parentSummary && (
                <div className="col-span-2">
                  <p className="text-slate-400 mb-1">Epic / Pai</p>
                  <span className="font-mono text-blue-600 font-bold text-[10px]">{issue.parentKey}</span>
                  <span className="text-slate-600 ml-1">{issue.parentSummary}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Descrição</h3>
              {loadingDetail ? (
                <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ) : detail?.description ? (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 rounded-xl p-3">
                  {detail.description}
                </pre>
              ) : (
                <p className="text-sm text-slate-400 italic">Sem descrição</p>
              )}
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <MessageSquare size={11} />
                Comentários {detail && `(${detail.comments.length})`}
              </h3>

              {loadingDetail ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {(detail?.comments || []).map(c => (
                    <div key={c.id} className="flex gap-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        {c.authorAvatar
                          ? <img src={c.authorAvatar} alt="" className="w-7 h-7 rounded-full" />
                          : <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center"><span className="text-[10px] text-white font-bold">{c.author.charAt(0)}</span></div>
                        }
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                          <span className="text-[10px] text-slate-400">{timeAgo(c.created)}</span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
                      </div>
                    </div>
                  ))}

                  {/* Add comment */}
                  <div className="flex gap-2.5 mt-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] text-white font-bold">V</span>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Adicionar comentário..."
                        rows={2}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment(); }}
                      />
                      {comment.trim() && (
                        <div className="flex justify-end mt-1.5">
                          <button
                            onClick={handleSendComment}
                            disabled={sendingComment}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                          >
                            <Send size={11} />
                            {sendingComment ? 'Enviando...' : 'Comentar'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Issue Modal ─────────────────────────────────────────────────────────
function CreateIssueModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (key: string) => void;
}) {
  const [summary, setSummary] = useState('');
  const [typeId, setTypeId] = useState('10004');
  const [priorityId, setPriorityId] = useState('3');
  const [parentKey, setParentKey] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!summary.trim()) { setError('Resumo é obrigatório'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/jira-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: summary.trim(),
          issuetypeId: typeId,
          priorityId,
          parentKey: parentKey.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao criar'); setCreating(false); return; }
      onCreate(data.key);
    } catch {
      setError('Erro de conexão');
    }
    setCreating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Plus size={16} className="text-blue-600" /> Criar Issue</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {ISSUE_TYPES_CREATE.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTypeId(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      typeId === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={13} /> {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Resumo *</label>
            <input
              type="text"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Descreva a tarefa em uma linha..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Priority + Parent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Prioridade</label>
              <select
                value={priorityId}
                onChange={e => setPriorityId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITIES_CREATE.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Epic / Pai (opcional)</label>
              <input
                type="text"
                value={parentKey}
                onChange={e => setParentKey(e.target.value.toUpperCase())}
                placeholder="ORC-59"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
          <button
            onClick={handleCreate}
            disabled={creating || !summary.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {creating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
            {creating ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
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
  const [aba, setAba] = useState<'lista' | 'quadro'>('quadro');
  const [sortField, setSortField] = useState<keyof JiraIssue>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jira');
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || `Erro ${res.status}`); setLoading(false); return; }
      setIssues(await res.json());
    } catch { setError('Erro de conexão'); }
    setLoading(false);
  }

  async function openPanel(issue: JiraIssue) {
    setPanelIssue(issue);
    setPanelDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/jira-issue?key=${issue.key}`);
      if (res.ok) setPanelDetail(await res.json());
    } catch {}
    setLoadingDetail(false);
  }

  function closePanel() { setPanelIssue(null); setPanelDetail(null); }

  function handleStatusChange(key: string, t: typeof TRANSITIONS[0]) {
    setIssues(prev => prev.map(i => i.key === key ? { ...i, status: t.name } : i));
    if (panelIssue?.key === key) {
      setPanelIssue(prev => prev ? { ...prev, status: t.name } : prev);
      setPanelDetail(prev => prev ? { ...prev, status: t.name } : prev);
    }
  }

  function handleCommentAdded(key: string, comment: JiraComment) {
    setPanelDetail(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
  }

  async function handleCreated(newKey: string) {
    setShowCreate(false);
    await load();
    // Open the new issue
    const found = issues.find(i => i.key === newKey);
    if (found) openPanel(found);
  }

  const allStatuses = useMemo(() => {
    const s = new Set<string>(); issues.forEach(i => { if (i.status) s.add(i.status); }); return Array.from(s).sort();
  }, [issues]);
  const allTipos = useMemo(() => {
    const s = new Set<string>(); issues.forEach(i => { if (i.issuetype) s.add(i.issuetype); }); return Array.from(s).sort();
  }, [issues]);
  const responsaveis = useMemo(() => {
    const s = new Set<string>(); issues.forEach(i => { if (i.assigneeName) s.add(i.assigneeName); }); return Array.from(s).sort();
  }, [issues]);

  const filtrados = useMemo(() => {
    let arr = issues.filter(i => {
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

  function toggleSort(field: keyof JiraIssue) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  const stats = useMemo(() => ({
    total: issues.length,
    ideia: issues.filter(i => i.status === 'Ideia').length,
    afazer: issues.filter(i => i.status === 'A fazer').length,
    andamento: issues.filter(i => i.status === 'Em andamento').length,
    analise: issues.filter(i => i.status === 'Em análise').length,
    concluido: issues.filter(i => i.status === 'Concluído').length,
  }), [issues]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
        <p className="text-red-700 font-medium mb-2">Erro ao carregar Jira</p>
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button onClick={load} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Tentar novamente</button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Time comercial — Tarefas</h1>
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">ORC</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">biasiengenharia-comercial.atlassian.net</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <RefreshCw size={13} /> Atualizar
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={14} /> Criar
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-2 flex-wrap mb-4">
          {[
            { label: 'Total', value: stats.total, cls: 'bg-slate-50 border-slate-200 text-slate-700' },
            { label: 'Ideia', value: stats.ideia, cls: 'bg-slate-50 border-slate-200 text-slate-600' },
            { label: 'A Fazer', value: stats.afazer, cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { label: 'Em Andamento', value: stats.andamento, cls: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Em Análise', value: stats.analise, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            { label: 'Concluído', value: stats.concluido, cls: 'bg-green-50 border-green-200 text-green-700' },
          ].map(s => (
            <div key={s.label} className={`border rounded-xl px-3 py-2 ${s.cls}`}>
              <p className="text-[10px] opacity-70">{s.label}</p>
              <p className="text-lg font-bold leading-none">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-200 -mb-[17px]">
          {([['lista', 'Lista', List], ['quadro', 'Quadro', LayoutGrid]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`flex items-center gap-1.5 pb-3 text-sm font-medium border-b-2 transition-colors ${aba === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-sm">
          <Search size={13} className="text-slate-400 flex-shrink-0" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar ticket, resumo..." className="bg-transparent text-sm flex-1 outline-none placeholder:text-slate-400" />
        </div>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white">
          <option value="">Todos os status</option>
          {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white">
          <option value="">Todos os tipos</option>
          {allTipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white">
          <option value="">Todos responsáveis</option>
          {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(busca || filtroStatus || filtroTipo || filtroResponsavel) && (
          <button onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroTipo(''); setFiltroResponsavel(''); }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <XCircle size={13} /> Limpar
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{filtrados.length} issues</span>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">

        {/* ── LISTA ── */}
        {aba === 'lista' && (
          <div className="p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-4 py-3 w-28">
                        <button onClick={() => toggleSort('key')} className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600">
                          Ticket <ArrowUpDown size={10} />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3">
                        <button onClick={() => toggleSort('summary')} className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600">
                          Resumo <ArrowUpDown size={10} />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 w-28 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 w-36 text-xs font-semibold text-slate-400 uppercase tracking-wide">Responsável</th>
                      <th className="text-left px-4 py-3 w-36">
                        <button onClick={() => toggleSort('status')} className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600">
                          Status <ArrowUpDown size={10} />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 w-20 text-xs font-semibold text-slate-400 uppercase tracking-wide">Prior.</th>
                      <th className="text-left px-4 py-3 w-24">
                        <button onClick={() => toggleSort('created')} className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600">
                          Criado <ArrowUpDown size={10} />
                        </button>
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtrados.map(issue => {
                      const TypeIcon = ISSUE_TYPE_ICON[issue.issuetype] || CheckSquare;
                      const isConcluido = issue.status === 'Concluído';
                      return (
                        <tr key={issue.key} onClick={() => openPanel(issue)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer group">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-bold text-blue-600">{issue.key}</span>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <span className={`font-medium text-[13px] leading-snug ${isConcluido ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {issue.summary}
                            </span>
                            {issue.parentSummary && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">{issue.parentKey} · {issue.parentSummary}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon size={12} className="text-slate-400 flex-shrink-0" />
                              <span className="text-xs text-slate-500">{issue.issuetype}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {issue.assigneeName ? (
                              <div className="flex items-center gap-1.5">
                                {issue.assigneeAvatar
                                  ? <img src={issue.assigneeAvatar} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
                                  : <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"><span className="text-[9px] text-white font-bold">{issue.assigneeName.charAt(0)}</span></div>
                                }
                                <span className="text-xs text-slate-500 truncate max-w-[90px]">{issue.assigneeName.split(' ')[0]}</span>
                              </div>
                            ) : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <StatusDropdown current={issue.status}
                              onSelect={t => handleStatusChange(issue.key, t)} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold ${PRIORITY_CLS[issue.priority] ?? 'text-slate-400'}`}>
                              {PRIORITY_ICON[issue.priority] ?? '–'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{formatDate(issue.created)}</td>
                          <td className="px-4 py-3">
                            <a href={issue.webUrl} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all inline-flex">
                              <ExternalLink size={12} />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                    {filtrados.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 text-sm">Nenhum issue encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── QUADRO ── */}
        {aba === 'quadro' && (
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-4">
              {COLUNAS_QUADRO.map(col => {
                const items = filtrados.filter(i => i.status === col.status);
                return (
                  <div key={col.status} className={`w-64 flex flex-col rounded-xl border-2 ${col.cor}`}>
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(col.status)}`} />
                      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex-1">{col.titulo}</h3>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.badge}`}>{items.length}</span>
                      <button onClick={() => { setShowCreate(true); }}
                        className="p-0.5 rounded text-slate-300 hover:text-slate-500 transition-colors" title="Criar issue">
                        <Plus size={13} />
                      </button>
                    </div>
                    <div className="overflow-y-auto px-2 pb-2 space-y-2 max-h-[calc(100vh-280px)]">
                      {items.map(issue => {
                        const TypeIcon = ISSUE_TYPE_ICON[issue.issuetype] || CheckSquare;
                        const isConcluido = issue.status === 'Concluído';
                        return (
                          <div key={issue.key} onClick={() => openPanel(issue)}
                            className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <TypeIcon size={11} className="text-slate-400 flex-shrink-0" />
                                <span className="font-mono text-[10px] font-bold text-blue-600">{issue.key}</span>
                              </div>
                              <a href={issue.webUrl} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-slate-200 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all">
                                <ExternalLink size={11} />
                              </a>
                            </div>
                            <p className={`text-xs font-semibold mb-2 leading-snug line-clamp-2 ${isConcluido ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {issue.summary}
                            </p>
                            {issue.parentSummary && (
                              <p className="text-[10px] text-slate-400 truncate mb-2">{issue.parentSummary}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold ${PRIORITY_CLS[issue.priority] ?? 'text-slate-300'}`}>
                                {PRIORITY_ICON[issue.priority] ?? '–'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {issue.labels.length > 0 && (
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{issue.labels[0]}</span>
                                )}
                                {issue.assigneeName && (
                                  issue.assigneeAvatar
                                    ? <img src={issue.assigneeAvatar} alt="" className="w-5 h-5 rounded-full" title={issue.assigneeName} />
                                    : <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0" title={issue.assigneeName}>
                                        <span className="text-[9px] text-white font-bold">{issue.assigneeName.charAt(0)}</span>
                                      </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {items.length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
                          Nenhum issue
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Issue Detail Panel ── */}
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

      {/* ── Create Issue Modal ── */}
      {showCreate && (
        <CreateIssueModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />
      )}
    </div>
  );
}
