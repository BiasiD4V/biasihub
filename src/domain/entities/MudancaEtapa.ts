import type { EtapaFunil } from '../value-objects/EtapaFunil';

export interface MudancaEtapa {
  id: string;
  orcamentoId: string;
  etapaAnterior: EtapaFunil | null; // null = criação
  etapaNova: EtapaFunil;
  responsavel: string;
  observacao?: string;
  data: string; // ISO datetime
  arquivo?: string; // URL do arquivo anexado
}
