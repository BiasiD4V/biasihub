export interface ItemAlmoxarifado {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  localizacao: string | null;
  tipo: 'material' | 'ferramenta';
  categoria?: string;
  marca?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
