import type { StatusRevisao } from '../value-objects/StatusRevisao';
import type { ConfiguracaoBDI } from './ConfiguracaoBDI';
import type { RevisaoDisciplina } from './RevisaoDisciplina';
import type { Excecao } from './Excecao';
import type { Aprovacao } from './Aprovacao';

export interface PoliticaComercialSnapshot {
  politicaComercialId: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  bdiPadrao: ConfiguracaoBDI;
  descontoMaximo: number;
  capturadaEm: string;
}

export interface RevisaoOrcamento {
  id: string;
  orcamentoId: string;
  numeroRevisao: number;
  status: StatusRevisao;
  bdi: ConfiguracaoBDI;
  politicaComercialSnapshot: PoliticaComercialSnapshot;
  excecoes: Excecao[];
  observacoes: string;
  criadaEm: string;
  criadoPor: string;
  aprovacoes: Aprovacao[];
  disciplinas: RevisaoDisciplina[];
}
