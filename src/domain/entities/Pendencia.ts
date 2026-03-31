export type StatusPendencia = 'aberta' | 'resolvida' | 'cancelada';

export interface Pendencia {
  id: string;
  orcamentoId: string;
  descricao: string;
  status: StatusPendencia;
  responsavel: string;
  prazo: string;     // YYYY-MM-DD
  criadaEm: string;  // ISO datetime
}
