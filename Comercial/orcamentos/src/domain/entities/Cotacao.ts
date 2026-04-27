export type OrigemCotacao = 'manual' | 'importado';

export interface Cotacao {
  id: string;
  insumoId: string;
  fornecedorId: string;
  valorUnitario: number;
  unidade: string;
  validade: string;
  origem: OrigemCotacao;
  observacao?: string;
  criadaEm: string;
}
