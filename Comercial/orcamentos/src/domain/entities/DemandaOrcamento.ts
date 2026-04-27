export type PrioridadeDemanda = 'normal' | 'urgente';

export interface DemandaOrcamento {
  id: string;
  codigo: string;
  titulo: string;
  clienteId: string;
  descricao: string;
  escopo?: string;
  tiposObraIds: string[];
  regiaoId: string;
  obraId?: string;
  prazoResposta?: string;
  solicitadaPor: string;
  prioridade: PrioridadeDemanda;
  criadaEm: string;
  criadoPor: string;
}
