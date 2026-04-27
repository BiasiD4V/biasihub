import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronRight, CheckSquare, User,
} from 'lucide-react';
import type { JiraIssue } from './biraTypes';
import {
  TRANSITIONS, COLUNAS_QUADRO, ISSUE_TYPE_ICON,
  PRIORITY_CLS, PRIORITY_ICON,
  statusCls, statusDot,
} from './biraTypes';
import { biraRepository } from '../../infrastructure/supabase/biraRepository';
import { useAuth } from '../../context/AuthContext';

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
        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${statusCls(current)} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-sm'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(current)}`} />
        {current.replace('_', ' ')}
        <ChevronDown size={10} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl z-50 w-44 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          {TRANSITIONS.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left hover:bg-slate-50 transition-colors ${t.id === current ? 'font-bold bg-slate-50 text-slate-800' : 'text-slate-600'}`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(t.id)}`} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── BiraTabela ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

interface BiraTabelaProps {
  filtrados: JiraIssue[];
  aba: 'quadro' | 'lista' | 'calendario' | 'cronograma' | 'registro';
  onOpenPanel: (issue: JiraIssue) => void;
  onStatusChange: (id: string, t: typeof TRANSITIONS[0]) => void;
}

export function BiraTabela({
  filtrados, aba, onOpenPanel, onStatusChange,
}: BiraTabelaProps) {
  return (
    <div className="flex-1 overflow-auto bg-slate-50/30">
      {aba === 'lista' && (
        <ListaHierarquica issues={filtrados} onOpenPanel={onOpenPanel} onStatusChange={onStatusChange} />
      )}
      {aba === 'calendario' && (
        <div className="p-12 text-center text-slate-400 font-bold italic">Visualização de Calendário em breve...</div>
      )}
      {aba === 'cronograma' && (
        <div className="p-12 text-center text-slate-400 font-bold italic">Visualização de Cronograma em breve...</div>
      )}
      {aba === 'quadro' && (
        <QuadroView issues={filtrados} onOpenPanel={onOpenPanel} onStatusChange={onStatusChange} />
      )}
    </div>
  );
}

// ── Lista Hierárquica ─────────────────────────────────────────────────────────
function ListaHierarquica({ issues, onOpenPanel, onStatusChange }: {
  issues: JiraIssue[];
  onOpenPanel: (i: JiraIssue) => void;
  onStatusChange: (id: string, t: typeof TRANSITIONS[0]) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(issues.filter(i => !i.parent_id).map(i => i.id)));

  const issueMap = useMemo(() => {
    const m: Record<string, JiraIssue> = {};
    issues.forEach(i => { m[i.id] = i; });
    return m;
  }, [issues]);

  const childMap = useMemo(() => {
    const map: Record<string, JiraIssue[]> = {};
    issues.forEach(i => {
      if (i.parent_id) {
        if (!map[i.parent_id]) map[i.parent_id] = [];
        map[i.parent_id].push(i);
      }
    });
    return map;
  }, [issues]);

  const roots = useMemo(() => {
    return issues.filter(i => !i.parent_id || !issueMap[i.parent_id]);
  }, [issues, issueMap]);

  function toggle(id: string) {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function IssueRow({ issue, depth }: { issue: JiraIssue; depth: number }) {
    const children = childMap[issue.id] || [];
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(issue.id);
    const TypeIcon = ISSUE_TYPE_ICON[issue.tipo] || CheckSquare;

    return (
      <>
        <tr onClick={() => onOpenPanel(issue)}
          className={`hover:bg-blue-50/40 transition-colors cursor-pointer border-b border-slate-100 ${depth > 0 ? 'bg-slate-50/5' : 'bg-white'}`}>
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-2" style={{ paddingLeft: depth * 28 }}>
              {hasChildren ? (
                <button onClick={e => { e.stopPropagation(); toggle(issue.id); }} className="p-1 rounded-lg hover:bg-slate-200">
                  <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
              ) : <span className="w-6" />}
              <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shadow-sm">
                <TypeIcon size={12} />
              </div>
              <span className="font-mono text-[10px] font-bold text-blue-600/70">{issue.codigo}</span>
            </div>
          </td>
          <td className="px-5 py-3.5"><span className="font-semibold text-sm text-slate-800">{issue.titulo}</span></td>
          <td className="px-5 py-3.5"><span className="text-xs font-semibold text-slate-600">{issue.responsavel_nome || '—'}</span></td>
          <td className="px-5 py-3.5">
            <div className={`text-[10px] font-extrabold uppercase tracking-widest ${PRIORITY_CLS[issue.prioridade]}`}>
              {PRIORITY_ICON[issue.prioridade]} {issue.prioridade}
            </div>
          </td>
          <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
            <StatusDropdown current={issue.status} onSelect={t => onStatusChange(issue.id, t)} />
          </td>
        </tr>
        {hasChildren && isOpen && children.map(child => <IssueRow key={child.id} issue={child} depth={depth + 1} />)}
      </>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-slate-200 shadow-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <th className="text-left px-5 py-4 w-64">Identificador</th>
              <th className="text-left px-5 py-4">Tarefa</th>
              <th className="text-left px-5 py-4 w-44">Responsável</th>
              <th className="text-left px-5 py-4 w-32">Prioridade</th>
              <th className="text-left px-5 py-4 w-44">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roots.map(p => <IssueRow key={p.id} issue={p} depth={0} />)}
            {issues.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">Nenhuma tarefa encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Quadro (Kanban) Premium ───────────────────────────────────────────────────
function QuadroView({ issues, onOpenPanel, onStatusChange }: {
  issues: JiraIssue[];
  onOpenPanel: (i: JiraIssue) => void;
  onStatusChange: (id: string, t: typeof TRANSITIONS[0]) => void;
}) {
  const { usuario } = useAuth();
  const issueMap = useMemo(() => {
     const m: Record<string, JiraIssue> = {};
     issues.forEach(i => { m[i.id] = i; });
     return m;
  }, [issues]);

  return (
    <div className="p-6 h-full flex gap-6 overflow-x-auto no-scrollbar">
      {COLUNAS_QUADRO.map(col => {
        const items = issues.filter(i => i.status === col.status);
        const transition = TRANSITIONS.find(t => t.id === col.status);
        return (
          <div key={col.status} className={`w-72 flex flex-col rounded-[32px] ${col.cor}`}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-4', 'ring-blue-400/20', 'bg-blue-50/30'); }}
            onDragLeave={e => { e.currentTarget.classList.remove('ring-4', 'ring-blue-400/20', 'bg-blue-50/30'); }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.classList.remove('ring-4', 'ring-blue-400/20', 'bg-blue-50/30');
              const id = e.dataTransfer.getData('text/plain');
              if (id && transition) {
                onStatusChange(id, transition);
                biraRepository.atualizar(id, { status: transition.id as any }).catch(console.error);
              }
            }}>
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-white/50 ${statusDot(col.status)}`} />
                <h3 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">{col.titulo}</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/40 ${col.badge}`}>{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 no-scrollbar">
              {items.map(issue => (
                  <QuadroIssueCard 
                    key={issue.id} 
                    issue={issue} 
                    issueMap={issueMap} 
                    usuario={usuario} 
                    onOpenPanel={onOpenPanel} 
                  />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── QuadroIssueCard (Fix: Hooks outside map) ──────────────────────────────────
function QuadroIssueCard({ 
  issue, issueMap, usuario, onOpenPanel
}: { 
  issue: JiraIssue; 
  issueMap: Record<string, JiraIssue>; 
  usuario: any; 
  onOpenPanel: (i: JiraIssue) => void; 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const TypeIcon = ISSUE_TYPE_ICON[issue.tipo] || CheckSquare;
  const pai = issue.parent_id ? issueMap[issue.parent_id] : null;
  const isMine = usuario && issue.responsavel_id === usuario.id;

  return (
    <div 
      draggable 
      onDragStart={e => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', issue.id);
        
        // CORREÇÃO DO OFFSET: 
        // Em alguns sistemas (como Electron com CSS transform), o browser se perde no cálculo do centro.
        // Forçamos o ponto de garra no lugar onde o mouse clicou.
        const rect = e.currentTarget.getBoundingClientRect();
        e.dataTransfer.setDragImage(e.currentTarget, e.clientX - rect.left, e.clientY - rect.top);
        
        e.currentTarget.style.opacity = '0.5';
      }}
      onDragEnd={e => {
        setIsDragging(false);
        e.currentTarget.style.opacity = '1';
      }}
      onClick={() => onOpenPanel(issue)}
      className={`group relative rounded-3xl p-5 transition-all cursor-grab active:cursor-grabbing overflow-hidden ${
        isMine 
          ? 'bg-white shadow-[0_0_30px_rgba(245,158,11,0.25)]' 
          : 'bg-white border border-slate-200/60 shadow-sm'
      } hover:shadow-xl hover:border-blue-300`}>
      
      {isMine && !isDragging && (
        <>
          <div className="absolute inset-0 z-0 p-[2px]">
            <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,transparent_30%,#f59e0b_50%,transparent_70%,transparent_100%)]" />
            <div className="absolute inset-[-2px] bg-white rounded-[22px] z-10" />
          </div>
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-ping z-20" />
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 z-20" />
        </>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 text-[10px]">
          <div className="flex items-center gap-2">
             <div className="p-1.5 rounded-xl bg-slate-50 text-slate-400 group-hover:text-blue-500 transition-colors"><TypeIcon size={11} /></div>
             <span className="font-mono font-bold text-blue-600/60 tracking-tight">{issue.codigo}</span>
          </div>
          <div className={`font-extrabold ${PRIORITY_CLS[issue.prioridade]}`}>{PRIORITY_ICON[issue.prioridade]}</div>
        </div>
        <p className="text-sm font-bold tracking-tight mb-4 leading-relaxed text-slate-700 group-hover:text-slate-900 transition-colors">{issue.titulo}</p>
        {pai && <div className="mb-4 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-bold text-indigo-700 truncate">Pai: {pai.codigo}</div>}
        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <span />
          {issue.responsavel_nome ? (
             <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center ring-2 ring-white">
                <span className="text-[10px] text-white font-extrabold">{issue.responsavel_nome.charAt(0).toUpperCase()}</span>
             </div>
          ) : <User size={12} className="text-slate-300" />}
        </div>
      </div>
    </div>
  );
}
