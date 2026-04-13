export interface ItemAlmoxarifado {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  localizacao: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
