export interface InsumoSnapshot {
  insumoId: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
}

export interface EncargosSnapshot {
  percentualTotal: number;
  detalhamento?: Record<string, number>;
}

export interface CondicaoExecucaoSnapshot {
  condicaoId: string;
  descricao: string;
  fatorAjuste: number;
}

export interface EquipeSnapshot {
  equipeId: string;
  nome: string;
  membros: Array<{ funcao: string; quantidadeHH: number }>;
}

export interface EquipamentoAuxiliarSnapshot {
  equipamentoId: string;
  nome: string;
  unidade: string;
  custoHora: number;
}

export interface ComposicaoSnapshot {
  composicaoId: string;
  versaoId: string;
  descricao: string;
  unidade: string;
  insumos: InsumoSnapshot[];
  encargos: EncargosSnapshot;
  produtividade: number;
  condicoesExecucao: CondicaoExecucaoSnapshot[];
  equipesExigidas: EquipeSnapshot[];
  equipamentosAuxiliares: EquipamentoAuxiliarSnapshot[];
  capturadaEm: string;
}
