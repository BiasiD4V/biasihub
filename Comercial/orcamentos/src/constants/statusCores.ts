/**
 * Mapeamento centralizado de cores/labels para status de propostas,
 * etapas do funil e resultados comerciais.
 *
 * Fontes originais:
 *   - src/pages/OrcamentosNovos.tsx   (PROPOSTAS_STATUS_CORES)
 *   - src/pages/Propostas.tsx         (STATUS_CORES)
 *   - src/domain/value-objects/EtapaFunil.ts  (ETAPA_CORES, ETAPA_LABELS)
 *   - src/domain/value-objects/ResultadoComercial.ts (RESULTADO_CORES, RESULTADO_LABELS)
 *   - src/components/orcamentos/KanbanFunil.tsx (resultado ganho/perdido inline)
 */

// ─── Status de Proposta (badge Tailwind classes) ────────────────────────────

export const STATUS_CORES: Record<string, string> = {
  FECHADO: 'bg-green-100 text-green-800',
  ENVIADO: 'bg-blue-100 text-blue-800',
  RECEBIDO: 'bg-cyan-100 text-cyan-800',
  'EM REVISÃO': 'bg-yellow-100 text-yellow-800',
  CANCELADO: 'bg-red-100 text-red-800',
  'NÃO FECHADO': 'bg-red-100 text-red-800',
  DECLINADO: 'bg-red-100 text-red-800',
  'CLIENTE NÃO DEU RETORNO': 'bg-gray-100 text-gray-700',
  'NEGOCIAÇÃO FUTURA': 'bg-purple-100 text-purple-800',
  'ORÇAMENTO': 'bg-orange-100 text-orange-800',
};

// ─── Status → cor da borda esquerda na tabela ───────────────────────────────

export const STATUS_BORDA_ESQUERDA: Record<string, string> = {
  FECHADO: 'border-l-green-500',
  ENVIADO: 'border-l-blue-500',
  'NÃO FECHADO': 'border-l-red-500',
  CANCELADO: 'border-l-red-400',
  DECLINADO: 'border-l-orange-400',
};

export const STATUS_BORDA_PADRAO = 'border-l-slate-200';

// ─── Prioridade calculada (A/B/C) ──────────────────────────────────────────

export const PRIORIDADE_CORES: Record<string, string> = {
  A: 'bg-red-100 text-red-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-slate-100 text-slate-500',
};

// ─── Resultado Comercial (Kanban cards inline) ──────────────────────────────

export const RESULTADO_CARD_CORES: Record<string, { bg: string; text: string }> = {
  ganho:   { bg: 'bg-green-50', text: 'text-green-700' },
  perdido: { bg: 'bg-red-50',   text: 'text-red-600'   },
};

// ─── Próxima ação — card Kanban ─────────────────────────────────────────────

export const ACAO_CORES = {
  vencida: 'bg-red-50 text-red-600',
  pendente: 'bg-amber-50 text-amber-700',
} as const;
