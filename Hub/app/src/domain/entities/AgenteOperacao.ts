export type FonteOperacao = 'supabase';

export type StatusFluxo = 'ativo' | 'pausado';

export type StatusFila =
  | 'novo'
  | 'processando'
  | 'aguardando_aprovacao'
  | 'concluido'
  | 'erro'
  | 'cancelado';

export type PrioridadeFila = 'baixa' | 'media' | 'alta' | 'critica';

export type StatusExecucao = 'iniciado' | 'concluido' | 'erro';

export type AtorAcao = 'usuario' | 'agente' | 'sistema';

export interface FluxoAgente {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  tabelaOrigem: string;
  tabelaDestino: string;
  ativo: boolean;
  pendencias: number;
  ultimoProcessamentoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ItemFilaAgente {
  id: string;
  fluxoId: string;
  fluxoNome: string;
  entidadeTipo: string;
  entidadeId: string;
  origem: string;
  status: StatusFila;
  prioridade: PrioridadeFila;
  payload: Record<string, any>;
  resultado: Record<string, any> | null;
  erro: string | null;
  reservadoPor: string | null;
  reservadoEm: string | null;
  tentativas: number;
  criadoPor: string | null;
  criadoPorNome: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ExecucaoAgente {
  id: string;
  filaId: string | null;
  fluxoId: string;
  fluxoNome: string;
  agenteNome: string;
  origemExecutor: string;
  status: StatusExecucao;
  entrada: Record<string, any>;
  saida: Record<string, any>;
  erro: string | null;
  iniciadoEm: string;
  finalizadoEm: string | null;
}

export interface AcaoFilaAgente {
  id: string;
  filaId: string;
  execucaoId: string | null;
  atorTipo: AtorAcao;
  atorId: string | null;
  atorNome: string;
  acao: string;
  detalhes: Record<string, any>;
  criadoEm: string;
}

export interface MetricasOperacaoAgente {
  fluxosAtivos: number;
  itensPendentes: number;
  itensProcessando: number;
  itensComErro: number;
  itensConcluidos24h: number;
}

export interface PainelOperacaoAgente {
  fonte: FonteOperacao;
  fluxos: FluxoAgente[];
  fila: ItemFilaAgente[];
  execucoes: ExecucaoAgente[];
  acoes: AcaoFilaAgente[];
  metricas: MetricasOperacaoAgente;
}

export interface CriarItemFilaInput {
  fluxoId: string;
  entidadeTipo: string;
  entidadeId: string;
  origem: string;
  prioridade: PrioridadeFila;
  payload?: Record<string, any>;
  usuarioId: string;
  usuarioNome: string;
}

export interface AtualizarStatusFilaInput {
  itemId: string;
  status: StatusFila;
  observacao?: string;
  resultado?: Record<string, any>;
  usuarioId: string;
  usuarioNome: string;
  acao: string;
}
