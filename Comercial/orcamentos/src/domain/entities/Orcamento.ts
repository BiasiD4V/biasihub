import type { RevisaoOrcamento } from './RevisaoOrcamento';

export interface Orcamento {
  id: string;
  numero: string;
  titulo: string;
  demandaId: string;
  revisoes: RevisaoOrcamento[];
  criadoEm: string;
  criadoPor: string;
}
