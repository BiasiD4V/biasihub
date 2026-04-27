export type TipoFollowUp = 'ligacao' | 'email' | 'whatsapp' | 'reuniao' | 'observacao';

export interface FollowUp {
  id: string;
  orcamentoId: string;
  tipo: TipoFollowUp;
  data: string;              // ISO datetime
  responsavel: string;
  resumo: string;
  proximaAcao?: string;
  dataProximaAcao?: string;  // YYYY-MM-DD
  arquivo?: string;          // URL do arquivo anexado
}
