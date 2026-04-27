import { useState } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'

/* ─────────────────────── Types ─────────────────────── */

export interface PropostaRow {
  id: string;
  numero_composto: string;
  data_entrada: string | null;
  cliente: string | null;
  obra: string | null;
  objeto: string | null;
  disciplina: string | null;
  responsavel: string | null;
  valor_orcado: number | null;
  valor_material: number | null;
  valor_mo: number | null;
  status: string | null;
  tipo: string | null;
  data_limite: string | null;
  ano: number | null;
  etapa_funil: string | null;
  resultado_comercial: string | null;
  chance_fechamento: string | null;
  urgencia: string | null;
  created_at: string;
}

export interface Filtros {
  anos: number[];
  status: string[];
  responsaveis: string[];
  disciplinas: string[];
  clientes: string[];
  tipos: string[];
}

/* ─────────────────────── Constantes visuais ─────────────────────── */

export const STATUS_CORES: Record<string, string> = {
  FECHADO: '#22c55e',
  ENVIADO: '#3b82f6',
  RECEBIDO: '#06b6d4',
  'EM REVISÃO': '#eab308',
  CANCELADO: '#f87171',
  'NÃO FECHADO': '#ef4444',
  DECLINADO: '#fca5a5',
  'CLIENTE NÃO DEU RETORNO': '#9ca3af',
  'NEGOCIAÇÃO FUTURA': '#a855f7',
  'ORÇAMENTO': '#f97316',
  'SEM STATUS': '#cbd5e1',
};

export const CORES_GRAFICO = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#facc15',
];

/* ─────────────────────── Formatadores ─────────────────────── */

export const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const FMT_BRL = (v: unknown) => {
  const value = toNumber(v);
  return value === 0
    ? '—'
    : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

export const FMT_BRL_SHORT = (v: unknown) => {
  const value = toNumber(v);
  if (value === 0) return '—';
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return FMT_BRL(value);
};

/* ─────────────────────── Custom Tooltip ─────────────────────── */

export function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.value > 100
            ? FMT_BRL(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ─────────────────────── Filter Chip ─────────────────────── */

export function FilterChip({
  label,
  options,
  selected,
  onToggle,
  icon: Icon,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  icon: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          count > 0
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        <Icon size={12} />
        {label}
        {count > 0 && (
          <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none">
            {count}
          </span>
        )}
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
            {count > 0 && (
              <button
                onClick={() => { selected.forEach(onToggle); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-slate-100"
              >
                Limpar seleção
              </button>
            )}
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => onToggle(opt)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────── KPI Card ─────────────────────── */

export function KPI({
  label,
  valor,
  sublabel,
  icon: Icon,
  cor = 'text-slate-800',
  bgIcon = 'bg-slate-100',
  trend,
}: {
  label: string;
  valor: string;
  sublabel?: string;
  icon: React.ElementType;
  cor?: string;
  bgIcon?: string;
  trend?: { valor: string; up: boolean } | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`${bgIcon} rounded-lg p-1.5`}>
          <Icon size={14} className="text-slate-500" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${cor} leading-tight`}>{valor}</p>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
            {trend.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend.valor}
          </span>
        )}
        {sublabel && <p className="text-[11px] text-slate-400">{sublabel}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────── Painel Wrapper ─────────────────────── */

export function Painel({
  titulo,
  children,
  className = '',
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{titulo}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
