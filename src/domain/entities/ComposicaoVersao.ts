export type StatusComposicaoVersao = 'rascunho' | 'ativa' | 'obsoleta';

export interface InsumoVersao {
  insumoId: string;
  unidadeId: string;
  quantidade: number;
  valorUnitario?: number;
}

export interface EncargosVersao {
  percentualTotal: number;
  detalhamento?: Record<string, number>;
}

export interface ComposicaoVersao {
  id: string;
  composicaoId: string;
  numeroVersao: string;
  status: StatusComposicaoVersao;
  descricao: string;
  unidade: string;
  insumos: InsumoVersao[];
  encargos: EncargosVersao;
  produtividadeId: string;
  equipeExigidaId: string;
  equipamentosAuxiliaresIds: string[];
  condicoesExecucaoIds: string[];
  publicadaEm?: string;
  publicadaPor?: string;
}
