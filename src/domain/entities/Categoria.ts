export type TipoCategoria = 'insumo' | 'servico' | 'equipamento';

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  tipo: TipoCategoria;
}
