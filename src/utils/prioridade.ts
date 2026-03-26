import type { OrcamentoCard } from '../context/NovoOrcamentoContext';

export type PrioridadeABC = 'A' | 'B' | 'C';

export interface ScoreABC {
  score: number;
  classe: PrioridadeABC;
}

/**
 * Calcula o score ABC do orçamento com base em 3 critérios:
 *
 * Chance de fechamento : alta=5 | media=3 | baixa=1 | undefined=0
 * Valor estratégico    : alto=3 | medio=2 | baixo=1 | undefined=0
 * Prazo (urgência)     : alta=2 | media=1 | baixa=0 | undefined=0
 *
 * Score total: 0–10
 *   A = 8–10
 *   B = 5–7
 *   C = 0–4
 *
 * Retorna null quando o caso já está fechado (ganho/perdido).
 */
export function calcularScoreABC(orc: OrcamentoCard): ScoreABC | null {
  if (orc.resultadoComercial !== 'em_andamento') return null;

  const pontosChance: Record<string, number> = { alta: 5, media: 3, baixa: 1 };
  const pontosEstrategico: Record<string, number> = { alto: 3, medio: 2, baixo: 1 };
  const pontosPrazo: Record<string, number> = { alta: 2, media: 1, baixa: 0 };

  const score =
    (pontosChance[orc.chanceFechamento ?? ''] ?? 0) +
    (pontosEstrategico[orc.valorEstrategico ?? ''] ?? 0) +
    (pontosPrazo[orc.urgencia ?? ''] ?? 0);

  const classe: PrioridadeABC = score >= 8 ? 'A' : score >= 5 ? 'B' : 'C';

  return { score, classe };
}

export const PRIORIDADE_ABC_CONFIG: Record<
  PrioridadeABC,
  { label: string; bg: string; text: string; border: string }
> = {
  A: {
    label: 'A',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  B: {
    label: 'B',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  C: {
    label: 'C',
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-slate-200',
  },
};

// ── Compatibilidade retroativa ────────────────────────────────────────────────
// Alguns componentes ainda usam o tipo `Prioridade`. Mantemos os exports para
// não quebrar compilação enquanto migramos.
export type Prioridade = 'alta' | 'media' | 'baixa';

export function calcularPrioridade(orc: OrcamentoCard): Prioridade | null {
  const abc = calcularScoreABC(orc);
  if (!abc) return null;
  if (abc.classe === 'A') return 'alta';
  if (abc.classe === 'B') return 'media';
  return 'baixa';
}

export const PRIORIDADE_CONFIG: Record<
  Prioridade,
  { label: string; bg: string; text: string; dot: string }
> = {
  alta: { label: 'Alta', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  media: { label: 'Média', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  baixa: { label: 'Baixa', bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-300' },
};
