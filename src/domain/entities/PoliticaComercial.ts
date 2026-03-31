import type { ConfiguracaoBDI } from './ConfiguracaoBDI';

export interface PoliticaComercial {
  id: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  bdiPadrao: ConfiguracaoBDI;
  descontoMaximo: number;
  observacoes?: string;
}
