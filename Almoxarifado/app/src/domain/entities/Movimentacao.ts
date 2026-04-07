export type TipoMovimentacao = 'entrada' | 'saida';

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
