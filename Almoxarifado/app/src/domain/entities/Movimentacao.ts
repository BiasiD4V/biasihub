export type TipoMovimentacao =
  | 'entrada'
  | 'saida'
  | 'saida_material'
  | 'saida_ferramenta'
  | 'saida_veiculo'
  | 'saida_finalizada'
  | 'devolucao'
  | 'cancelamento'
  | 'cancelamento_separacao'
  | 'negativa'
  | 'manutencao_inicio'
  | 'manutencao_fim'
  | 'agenda_bloqueio';

export interface Movimentacao {
  id: string;
  item_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  obra: string | null;
  responsavel_id: string;
  data: string;
  observacao: string | null;
  criado_em: string;
  // join
  item?: { codigo: string; descricao: string; unidade: string };
  responsavel?: { nome: string };
}
