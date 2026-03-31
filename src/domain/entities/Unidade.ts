export type TipoUnidade = 'comprimento' | 'area' | 'volume' | 'unidade' | 'outro';

export interface Unidade {
  id: string;
  simbolo: string;
  descricao: string;
  tipo: TipoUnidade;
}
