export interface ItemAlmoxarifado {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  localizacao: string | null;
  tipo: 'material' | 'ferramenta';
  categoria?: string | null;
  marca?: string | null;
  preco_unitario?: number | null;
  grupo?: string | null;
  familia?: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
