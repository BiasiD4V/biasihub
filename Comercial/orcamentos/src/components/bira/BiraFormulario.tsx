import { useState, useEffect, useRef } from 'react';
import {
  RefreshCw, Plus, X, ChevronDown, Send,
  CheckSquare, Clock, MessageSquare, Search, Trash2, Pencil, Bug,
} from 'lucide-react';
import type { JiraIssue, JiraComment, JiraIssueDetail } from './biraTypes';
import {
  TRANSITIONS, ISSUE_TYPES_CREATE, PRIORITIES_CREATE,
  ISSUE_TYPE_ICON, PRIORITY_CLS, PRIORITY_ICON,
  statusCls, statusDot, formatDate, timeAgo,
} from './biraTypes';
import { biraRepository } from '../../infrastructure/supabase/biraRepository';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuth } from '../../context/AuthContext';

// ── SearchSelect Component ──────────────────────────────────────────────────
function SearchSelect<T extends { id: string; titulo?: string; nome?: string; codigo?: string }>({ 
  label, placeholder, items, value, onSelect, icon: Icon, disabled 
}: {
  label: string;
  placeholder: string;
  items: T[];
  value: string; // id
  onSelect: (item: T | null) => void;
  icon: any;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [panelMaxHeight, setPanelMaxHeight] = useState(280);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(i => i.id === value);
  const filtered = items.filter(i => 
    (i.titulo || i.nome || '').toLowerCase().includes(search.toLowerCase()) || 
    (i.codigo || '').toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10);

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const viewportMargin = 20;
    const minPanelHeight = 170;
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - viewportMargin);
    const spaceAbove = Math.max(0, rect.top - viewportMargin);
    const shouldOpenUpwards = spaceBelow < minPanelHeight && spaceAbove > spaceBelow;
    const available = shouldOpenUpwards ? spaceAbove : spaceBelow;
    const clampedPanelHeight = Math.max(minPanelHeight, Math.min(320, available));

    setOpenUpwards(shouldOpenUpwards);
    setPanelMaxHeight(Math.max(minPanelHeight, clampedPanelHeight));
  }, [open]);

  function toggleOpen() {
    if (disabled) return;
    setOpen((o) => !o);
  }

  return (
    <div ref={ref} className="relative space-y-1.5 flex-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</label>
      <div 
        className={`relative group cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={toggleOpen}
      >
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors`}>
          <Icon size={14} />
        </div>
        <div className={`w-full pl-11 pr-10 py-4 text-sm font-semibold truncate bg-slate-50 border border-transparent rounded-2xl group-hover:bg-white group-hover:border-blue-600/30 transition-all ${selectedItem ? 'text-slate-900' : 'text-slate-400'}`}>
          {selectedItem ? (selectedItem.codigo ? `${selectedItem.codigo} - ${selectedItem.titulo}` : selectedItem.nome) : placeholder}
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
           <ChevronDown size={14} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {open && (
        <div
          className={`absolute left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[70] overflow-hidden animate-in fade-in duration-200 ${
            openUpwards ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'
          }`}
          style={{ maxHeight: `${panelMaxHeight}px` }}
        >
          <div className="p-3 border-b border-slate-50 shrink-0">
            <input 
              autoFocus
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500/10"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div
            className="overflow-y-auto p-2 space-y-1 no-scrollbar"
            style={{ maxHeight: `${Math.max(96, panelMaxHeight - 66)}px` }}
          >
            <button
               onClick={() => { onSelect(null); setOpen(false); }}
               className="w-full text-left px-4 py-2.5 text-xs text-slate-400 hover:bg-slate-50 rounded-xl transition-colors italic"
            >
               Nenhum / Remover
            </button>
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={(e) => { e.stopPropagation(); onSelect(item); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl transition-all group ${item.id === value ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-blue-50/50 text-slate-600'}`}
              >
                <div className="flex flex-col">
                   <span className="text-xs truncate">{item.titulo || item.nome}</span>
                   {item.codigo && <span className="text-[9px] text-slate-400 font-mono">{item.codigo}</span>}
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="p-4 text-center text-xs text-slate-400">Nenhum resultado</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── StatusDropdown ───────────────────────────────────────────────────────────
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
        className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm transition-all ${statusCls(current)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
      >
        <span className={`w-2 h-2 rounded-full ring-2 ring-white/50 ${statusDot(current)}`} />
        {current.charAt(0).toUpperCase() + current.slice(1).replace('_', ' ')}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl z-50 w-48 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {TRANSITIONS.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left hover:bg-blue-50/50 transition-colors ${t.id === current ? 'bg-blue-50/80 font-bold text-blue-700' : 'text-slate-600'}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusDot(t.id)}`} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal Documentar Bug ────────────────────────────────────────────────────
interface ModalDocumentarBugProps {
  issue: JiraIssue;
  onConfirmar: (causa: string, resolucao: string, modulo: string) => Promise<void>;
  onPular: () => void;
}

function ModalDocumentarBug({ issue, onConfirmar, onPular }: ModalDocumentarBugProps) {
  const { usuario } = useAuth();
  const [causa, setCausa] = useState('');
  const [resolucao, setResolucao] = useState('');
  const [modulo, setModulo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvarAprendizado, setSalvarAprendizado] = useState(false);

  const MODULOS = ['Hub', 'Comercial', 'Almoxarifado', 'Bira', 'Obras', 'Reuniões', 'Outro'];

  async function handleConfirmar() {
    if (!resolucao.trim()) return;
    setSalvando(true);
    await onConfirmar(causa.trim(), resolucao.trim(), modulo);
    if (salvarAprendizado && usuario) {
      try {
        await supabase.from('aprendizados').insert({
          autor: usuario.nome,
          categoria: 'TI/Sistema',
          problema: issue.titulo,
          causa: causa.trim() || null,
          solucao: resolucao.trim(),
          como_evitar: resolucao.trim() || null,
          bira_tarefa_id: issue.id,
          criado_por_id: usuario.id,
        });
      } catch (err) {
        console.error('Erro ao registrar aprendizado:', err);
      }
    }
    setSalvando(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <Bug size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Documentar Bug</h3>
            <p className="text-xs text-slate-400 font-medium">{issue.codigo} · {issue.titulo}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Módulo Afetado</label>
            <div className="flex flex-wrap gap-2">
              {MODULOS.map(m => (
                <button key={m} onClick={() => setModulo(m === modulo ? '' : m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${modulo === m ? 'bg-red-500 text-white border-red-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-red-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">O que causou o bug?</label>
            <textarea value={causa} onChange={e => setCausa(e.target.value)} rows={2}
              placeholder="Ex: Validação ausente ao salvar formulário vazio..."
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Como foi resolvido? <span className="text-red-500">*</span></label>
            <textarea value={resolucao} onChange={e => setResolucao(e.target.value)} rows={3}
              placeholder="Ex: Adicionada verificação de campos obrigatórios antes do submit..."
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={salvarAprendizado}
              onChange={e => setSalvarAprendizado(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-xs text-slate-500 font-medium">📘 Registrar também nos Aprendizados</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onPular} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">
            Pular documentação
          </button>
          <button onClick={handleConfirmar} disabled={!resolucao.trim() || salvando}
            className="flex-2 flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-500/20 transition-all disabled:opacity-40">
            {salvando ? 'Salvando...' : 'Documentar e Concluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Issue Detail Panel ──────────────────────────────────────────────────────
export interface IssuePanelProps {
  issue: JiraIssue;
  detail: JiraIssueDetail | null;
  loadingDetail: boolean;
  onClose: () => void;
  onStatusChange: (id: string, t: typeof TRANSITIONS[0]) => void;
  onCommentAdded: (id: string, comment: JiraComment) => void;
  onDeleted?: (id: string) => void;
}

export function IssuePanel({
  issue, detail, loadingDetail, onClose, onStatusChange, onCommentAdded, onDeleted,
}: IssuePanelProps) {
  const { usuario } = useAuth();
  const [changingStatus, setChangingStatus] = useState(false);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const TypeIcon = ISSUE_TYPE_ICON[issue.tipo] || CheckSquare;
  const [showDocModal, setShowDocModal] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<typeof TRANSITIONS[0] | null>(null);

  // Inline responsible editing
  const [localResp, setLocalResp] = useState<{ id: string | null; nome: string | null }>({
    id: issue.responsavel_id as string | null,
    nome: issue.responsavel_nome as string | null,
  });
  const [editandoResp, setEditandoResp] = useState(false);
  const [membros, setMembros] = useState<{ id: string; nome: string }[]>([]);
  const [selectedRespId, setSelectedRespId] = useState<string>('');
  const [salvandoResp, setSalvandoResp] = useState(false);

  useEffect(() => {
    if (!editandoResp || membros.length > 0) return;
    biraRepository.listarMembrosComercial().then(setMembros).catch(console.error);
  }, [editandoResp]);

  async function handleSaveResp() {
    setSalvandoResp(true);
    try {
      const membro = membros.find(m => m.id === selectedRespId) ?? null;
      await biraRepository.atualizar(issue.id, {
        responsavel_id: membro?.id ?? null,
        responsavel_nome: membro?.nome ?? null,
      } as any);
      setLocalResp({ id: membro?.id ?? null, nome: membro?.nome ?? null });
      setEditandoResp(false);
    } catch (err) {
      console.error(err);
    }
    setSalvandoResp(false);
  }

  function handleOpenRespEdit() {
    setSelectedRespId(localResp.id ?? '');
    setEditandoResp(true);
  }

  async function handleStatusChange(t: typeof TRANSITIONS[0]) {
    if (issue.tipo === 'bug' && t.id === 'concluido' && !issue.bug_resolucao) {
      setPendingTransition(t);
      setShowDocModal(true);
      return;
    }
    setChangingStatus(true);
    try {
      await biraRepository.atualizar(issue.id, { status: t.id as any });
      onStatusChange(issue.id, t);
    } catch (err) {
      console.error(err);
    }
    setChangingStatus(false);
  }

  async function handleDocumentarBug(causa: string, resolucao: string, modulo: string) {
    if (!pendingTransition) return;
    setChangingStatus(true);
    try {
      await biraRepository.atualizar(issue.id, {
        status: 'concluido',
        bug_causa: causa || null,
        bug_resolucao: resolucao,
        bug_modulo: modulo || null,
        bug_documentado_em: new Date().toISOString(),
      } as any);
      onStatusChange(issue.id, pendingTransition);
    } catch (err) { console.error(err); }
    setChangingStatus(false);
    setShowDocModal(false);
    setPendingTransition(null);
  }

  async function handlePularDocumentacao() {
    if (!pendingTransition) return;
    setChangingStatus(true);
    try {
      await biraRepository.atualizar(issue.id, { status: 'concluido' } as any);
      onStatusChange(issue.id, pendingTransition);
    } catch (err) { console.error(err); }
    setChangingStatus(false);
    setShowDocModal(false);
    setPendingTransition(null);
  }

  async function handleSendComment() {
    if (!comment.trim() || !usuario) return;
    setSendingComment(true);
    try {
      const data = await biraRepository.adicionarComentario({
        tarefa_id: issue.id,
        autor_id: usuario.id,
        autor_nome: usuario.nome,
        autor_avatar: null,
        corpo: comment.trim(),
      });
      onCommentAdded(issue.id, data);
      setComment('');
    } catch (err) {
      console.error(err);
    }
    setSendingComment(false);
  }

  async function handleDelete() {
    if (window.confirm(`Deseja realmente excluir a tarefa ${issue.codigo}?`)) {
      try {
        await biraRepository.deletar(issue.id);
        onDeleted?.(issue.id);
        onClose();
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir tarefa.');
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch">
      <div className="flex-1 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-2xl shadow-[-20px_0_50px_-10px_rgba(0,0,0,0.1)] flex flex-col h-full border-l border-white/40 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><TypeIcon size={18} /></div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-600 tracking-wider bg-blue-50 px-2 py-0.5 rounded-lg">{issue.codigo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
              title="Excluir Tarefa"
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100/80 text-slate-400 hover:text-slate-600 transition-all"><X size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 no-scrollbar">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 leading-tight mb-4">{issue.titulo}</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <StatusDropdown current={issue.status} onSelect={handleStatusChange} disabled={changingStatus} />
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs font-bold ${PRIORITY_CLS[issue.prioridade]}`}>
                {PRIORITY_ICON[issue.prioridade]} <span className="opacity-80">{issue.prioridade}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-blue-50/30 rounded-3xl p-6 border border-blue-100/50">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Responsável</p>
                {editandoResp ? (
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedRespId}
                      onChange={e => setSelectedRespId(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-semibold bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      autoFocus
                    >
                      <option value="">— Sem responsável</option>
                      {membros.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveResp}
                        disabled={salvandoResp}
                        className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-all"
                      >
                        {salvandoResp ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={() => setEditandoResp(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 group">
                    {localResp.nome ? (
                      <>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <span className="text-xs text-white font-bold">{localResp.nome.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{localResp.nome}</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Não atribuído</span>
                    )}
                    <button
                      onClick={handleOpenRespEdit}
                      className="ml-1 p-1 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Editar responsável"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Criado por</p>
                <span className="text-sm font-semibold text-slate-600">{issue.criador_nome}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Prazos</p>
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" />
                  {issue.data_limite ? formatDate(issue.data_limite) : 'Sem prazo'}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Atualizado</p>
                <span className="text-sm font-semibold text-slate-600">{timeAgo(issue.atualizado_em)}</span>
              </div>
            </div>
          </div>

          <div>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Descrição</h3>
             {loadingDetail ? (
                <div className="space-y-2"><div className="h-4 bg-slate-100 rounded-full w-full animate-pulse" /><div className="h-4 bg-slate-100 rounded-full w-3/4 animate-pulse" /></div>
             ) : issue.descricao ? (
                <div className="prose prose-sm max-w-none text-slate-700 bg-slate-50/50 rounded-2xl p-5 border border-slate-100/50 leading-relaxed whitespace-pre-wrap">{issue.descricao}</div>
             ) : <p className="text-sm text-slate-400 italic text-center py-4 border border-dashed rounded-2xl">Sem descrição</p>}
          </div>

          {issue.tipo === 'bug' && (
            <div className={`rounded-3xl p-6 border ${issue.bug_resolucao ? 'bg-red-50/40 border-red-100/60' : 'bg-slate-50/50 border-dashed border-slate-200'}`}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-red-500">
                <Bug size={14} />
                Documentação do Bug
              </h3>
              {issue.bug_resolucao ? (
                <div className="space-y-3">
                  {issue.bug_modulo && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Módulo</p>
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-xl">{issue.bug_modulo}</span>
                    </div>
                  )}
                  {issue.bug_causa && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Causa</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{issue.bug_causa}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resolução</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{issue.bug_resolucao}</p>
                  </div>
                  {issue.bug_documentado_em && (
                    <p className="text-[10px] text-slate-400 font-semibold">Documentado em {new Date(issue.bug_documentado_em).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-2">Bug ainda não documentado</p>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageSquare size={14} className="text-blue-500" />
              Histórico de Comentários {detail && `(${detail.comentarios.length})`}
            </h3>
            <div className="space-y-6 mb-20">
              {(detail?.comentarios || []).map(c => (
                <div key={c.id} className="flex gap-4 group">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs text-indigo-700 font-bold">{c.autor_nome.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-800">{c.autor_nome}</span>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{timeAgo(c.criado_em)}</span>
                    </div>
                    <div className="bg-slate-50/80 rounded-2xl px-4 py-3 text-sm text-slate-700 border border-slate-100/50">{c.corpo}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showDocModal && pendingTransition && (
          <ModalDocumentarBug
            issue={issue}
            onConfirmar={handleDocumentarBug}
            onPular={handlePularDocumentacao}
          />
        )}

        <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl p-4 border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
           <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20">
                <span className="text-xs text-white font-bold">{usuario?.nome?.charAt(0) || 'U'}</span>
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Escreva algo importante..."
                  rows={1}
                  className="w-full text-sm bg-slate-100/50 border border-transparent rounded-2xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500/30 transition-all min-h-[48px]"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment(); }}
                />
                <button
                  onClick={handleSendComment}
                  disabled={sendingComment || !comment.trim()}
                  className="absolute right-2 top-2 p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all disabled:opacity-0"
                ><Send size={18} /></button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Issue Modal ───────────────────────────────────────────────────────
export function CreateIssueModal({ onClose, onCreate }: { onClose: () => void; onCreate: (id: string) => void }) {
  const { usuario } = useAuth();
  const [summary, setSummary] = useState('');
  const [typeId, setTypeId] = useState('tarefa');
  const [priorityId, setPriorityId] = useState('Medium');
  const [parentId, setParentId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [assigneeNome, setAssigneeNome] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  
  const [todasTarefas, setTodasTarefas] = useState<JiraIssue[]>([]);
  const [comercial, setComercial] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      try {
        const [tarefas, membrosComercial] = await Promise.all([
          biraRepository.listarTodas(),
          biraRepository.listarMembrosComercial(),
        ]);

        if (!ativo) return;
        setTodasTarefas(tarefas);

        if (membrosComercial.length > 0) {
          setComercial(membrosComercial);
        } else if (usuario?.id && usuario?.nome) {
          setComercial([{ id: usuario.id, nome: usuario.nome }]);
        } else {
          setComercial([]);
        }
      } catch (err) {
        console.error(err);
        if (!ativo) return;
        if (usuario?.id && usuario?.nome) {
          setComercial([{ id: usuario.id, nome: usuario.nome }]);
        } else {
          setComercial([]);
        }
      }
    }

    carregarDados();
    return () => {
      ativo = false;
    };
  }, [usuario?.id, usuario?.nome]);

  async function handleCreate() {
    if (!summary.trim() || !usuario) { setError('Falha na autenticação'); return; }
    setCreating(true);
    setError('');
    try {
      const parentFound = parentId ? todasTarefas.find(t => t.id === parentId) : null;

      // ── Regras de Hierarquia Singularity ───────────────────────────────────────────
      const dadosParaCriar: any = {
        titulo: summary.trim(),
        tipo: typeId as any,
        prioridade: priorityId as any,
        descricao: description.trim() || null,
        status: 'ideia',
        criador_id: usuario.id,
        criador_nome: usuario.nome,
        parent_id: parentId,
        responsavel_id: assigneeId,
        responsavel_nome: assigneeNome,
      };

      if (typeId === 'epic') {
        if (parentFound) {
          setError('Um Epic é o nível máximo e não pode ter um pai.');
          setCreating(false); return;
        }
      } 
      else if (typeId === 'feature') {
        if (!parentFound || parentFound.tipo !== 'epic') {
          setError('Uma Feature exige um EPIC como pai.');
          setCreating(false); return;
        }
      }
      else if (typeId === 'tarefa') {
        if (!parentFound || parentFound.tipo !== 'feature') {
          setError('Uma Tarefa exige uma FEATURE como pai.');
          setCreating(false); return;
        }
      }
      else if (typeId === 'bug' || typeId === 'recurso') {
         // Bugs e Recursos não precisam de pai.
         dadosParaCriar.parent_id = null;
      }

      const data = await biraRepository.criar(dadosParaCriar);
      onCreate(data.id);
    } catch (err) {
      console.error(err);
      setError('Erro ao criar tarefa. Tente novamente.');
    }
    setCreating(false);
  }

  // Filtragem de pais sugeridos baseada no tipo selecionado
  const suggestedParents = todasTarefas.filter(t => {
     if (typeId === 'feature') return t.tipo === 'epic';
     if (typeId === 'tarefa') return t.tipo === 'feature';
     return false; // Epic, Bug e Recurso não buscam pais
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="my-2 sm:my-0 bg-white rounded-[32px] shadow-2xl w-full max-w-xl border border-white/40 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 text-white"><Plus size={20} /></div>
             <h3 className="text-xl font-bold text-slate-900">Nova Tarefa Bira</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-8 pt-4 space-y-6">
          <div className="flex flex-wrap gap-2">
            {ISSUE_TYPES_CREATE.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => {
                  setTypeId(t.id);
                  setParentId(null); 
                }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${typeId === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-600 ring-offset-2' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  <Icon size={14} /> {t.name}
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Título da Tarefa</label>
              <input type="text" value={summary} onChange={e => setSummary(e.target.value)} placeholder="Ex: Refatorar layout" className="w-full px-5 py-4 font-semibold bg-slate-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600/30 transition-all" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Descrição</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="O que precisa ser feito?" rows={4} className="w-full px-5 py-4 text-sm bg-slate-50 border border-transparent rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600/30 transition-all font-medium" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Prioridade</label>
                <select value={priorityId} onChange={e => setPriorityId(e.target.value)} className="w-full px-5 py-4 text-sm font-bold bg-slate-50 border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white focus:border-blue-600/30 transition-all">
                  {PRIORITIES_CREATE.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <SearchSelect 
                  label="Tarefa Pai"
                  placeholder={
                    typeId === 'feature' ? "Selecione um Epic..." : 
                    typeId === 'tarefa' ? "Selecione uma Feature..." : 
                    "Independente"
                  }
                  items={suggestedParents}
                  value={parentId || ''}
                  onSelect={(item) => setParentId(item?.id || null)}
                  icon={Search}
                  disabled={['epic', 'bug', 'recurso'].includes(typeId)}
                />
                <SearchSelect 
                  label="Responsável (Comercial)"
                  placeholder="Quem fará?"
                  items={comercial}
                  value={assigneeId || ''}
                  onSelect={(item) => {
                    setAssigneeId(item?.id || null);
                    setAssigneeNome(item?.nome || null);
                  }}
                  icon={CheckSquare}
                />
              </div>
            </div>
          </div>
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold ring-1 ring-red-100">{error}</div>}
        </div>

        <div className="px-8 pb-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-4 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
          <button onClick={handleCreate} disabled={creating || !summary.trim()} className="flex-1 sm:flex-none px-8 py-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
            {creating ? <RefreshCw size={18} className="animate-spin" /> : <CheckSquare size={18} />}
            {creating ? 'Criando...' : 'Criar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  );
}
