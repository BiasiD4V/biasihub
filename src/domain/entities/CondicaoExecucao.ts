export type TipoCondicao = 'altura' | 'confinamento' | 'periodo' | 'outro';

export interface CondicaoExecucao {
  id: string;
  descricao: string;
  fatorAjuste: number;
  tipo: TipoCondicao;
}
