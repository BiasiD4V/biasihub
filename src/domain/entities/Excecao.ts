export type TipoExcecao = 'tecnica' | 'contratual' | 'comercial';

export interface Excecao {
  id: string;
  descricao: string;
  impacto: string;
  tipo: TipoExcecao;
}
