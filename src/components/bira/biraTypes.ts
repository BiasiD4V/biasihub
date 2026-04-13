import {
  Zap, Star, CheckSquare, Bug, Package,
} from 'lucide-react';
import type { BiraTarefa, BiraComentario } from '../../infrastructure/supabase/biraRepository';

export type { BiraTarefa as JiraIssue, BiraComentario as JiraComment };
export interface JiraIssueDetail extends BiraTarefa {
  comentarios: BiraComentario[];
}

// ── Constants ──────────────────────────────────────────────────────────────────
export const TRANSITIONS: { id: string; name: string }[] = [
  { id: 'ideia',        name: 'Ideia' },
  { id: 'a_fazer',      name: 'A fazer' },
  { id: 'em_andamento', name: 'Em andamento' },
  { id: 'em_analise',   name: 'Em análise' },
  { id: 'concluido',    name: 'Concluído' },
];

export const STATUS_DB_MAP: Record<string, string> = {
  'Ideia':        'ideia',
  'A fazer':      'a_fazer',
  'Em andamento': 'em_andamento',
  'Em análise':   'em_analise',
  'Concluído':    'concluido',
};

export const STATUS_CONFIG: Record<string, { cls: string; dot: string }> = {
  'Ideia':        { cls: 'bg-slate-100 text-slate-600 border border-slate-200',   dot: 'bg-slate-400' },
  'A fazer':      { cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200', dot: 'bg-yellow-400' },
  'Em andamento': { cls: 'bg-blue-100 text-blue-700 border border-blue-200',       dot: 'bg-blue-500' },
  'Em análise':   { cls: 'bg-amber-100 text-amber-700 border border-amber-200',    dot: 'bg-amber-500' },
  'Concluído':    { cls: 'bg-green-100 text-green-700 border border-green-200',    dot: 'bg-green-500' },
};

export const STATUS_LABEL: Record<string, string> = {
  'ideia':        'Ideia',
  'a_fazer':      'A fazer',
  'em_andamento': 'Em andamento',
  'em_analise':   'Em análise',
  'concluido':    'Concluído',
};

export function statusCls(s: string) { 
  const label = STATUS_LABEL[s] || s;
  return STATUS_CONFIG[label]?.cls ?? 'bg-slate-100 text-slate-500 border border-slate-200'; 
}
export function statusDot(s: string) { 
  const label = STATUS_LABEL[s] || s;
  return STATUS_CONFIG[label]?.dot ?? 'bg-slate-400'; 
}

export const COLUNAS_QUADRO = [
  { status: 'ideia',        titulo: 'IDEIA',        cor: 'border-slate-300 bg-slate-50/60',  badge: 'bg-slate-100 text-slate-600' },
  { status: 'a_fazer',      titulo: 'A FAZER',      cor: 'border-yellow-300 bg-yellow-50/60', badge: 'bg-yellow-100 text-yellow-700' },
  { status: 'em_andamento', titulo: 'EM ANDAMENTO', cor: 'border-blue-300 bg-blue-50/60',     badge: 'bg-blue-100 text-blue-700' },
  { status: 'em_analise',   titulo: 'EM ANÁLISE',   cor: 'border-amber-300 bg-amber-50/60',   badge: 'bg-amber-100 text-amber-700' },
  { status: 'concluido',    titulo: 'CONCLUÍDO',    cor: 'border-green-300 bg-green-50/60',   badge: 'bg-green-100 text-green-700' },
];

export const PRIORITY_CLS: Record<string, string> = {
  Highest: 'text-red-600', High: 'text-orange-500', Medium: 'text-yellow-500',
  Low: 'text-blue-400', Lowest: 'text-slate-400',
};
export const PRIORITY_ICON: Record<string, string> = {
  Highest: '↑↑', High: '↑', Medium: '–', Low: '↓', Lowest: '↓↓',
};

export const ISSUE_TYPE_ICON: Record<string, React.ElementType> = {
  epic: Zap, feature: Star, tarefa: CheckSquare,
  bug: Bug, recurso: Package,
};

export const ISSUE_TYPES_CREATE = [
  { id: 'epic',     name: 'Epic',     icon: Zap },
  { id: 'feature',  name: 'Feature',  icon: Star },
  { id: 'tarefa',   name: 'Tarefa',   icon: CheckSquare },
  { id: 'bug',      name: 'Bug',      icon: Bug },
  { id: 'recurso',  name: 'Recurso',  icon: Package },
];

export const PRIORITIES_CREATE = [
  { id: 'Highest', name: 'Highest' }, { id: 'High', name: 'High' },
  { id: 'Medium',  name: 'Medium' }, { id: 'Low', name: 'Low' }, { id: 'Lowest', name: 'Lowest' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
export function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}
export function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}
