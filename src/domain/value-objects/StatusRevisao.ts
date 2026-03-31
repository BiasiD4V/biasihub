export type StatusRevisao =
  | 'em_elaboracao'
  | 'em_revisao'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'reprovado'
  | 'proposta_emitida';

export const STATUS_LABELS: Record<StatusRevisao, string> = {
  em_elaboracao: 'Em elaboração',
  em_revisao: 'Em revisão',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  proposta_emitida: 'Proposta emitida',
};

export const TRANSICOES_VALIDAS: Record<StatusRevisao, StatusRevisao[]> = {
  em_elaboracao: ['em_revisao'],
  em_revisao: ['aguardando_aprovacao', 'em_elaboracao'],
  aguardando_aprovacao: ['aprovado', 'reprovado'],
  aprovado: ['proposta_emitida'],
  reprovado: ['em_elaboracao'],
  proposta_emitida: [],
};
