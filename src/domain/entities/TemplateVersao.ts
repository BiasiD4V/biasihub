export type StatusTemplateVersao = 'rascunho' | 'ativa' | 'obsoleta';

export interface ItemTemplateVersao {
  disciplinaNome: string;
  etapaNome: string;
  ambienteNome: string;
  tipo: string;
  descricao?: string;
  composicaoId?: string;
}

export interface EstruturaTemplate {
  disciplinas: Array<{
    nome: string;
    etapas: Array<{
      nome: string;
      ambientes: string[];
    }>;
  }>;
}

export interface TemplateVersao {
  id: string;
  templateId: string;
  numeroVersao: string;
  status: StatusTemplateVersao;
  estrutura: EstruturaTemplate;
  itensPreDefinidos: ItemTemplateVersao[];
  publicadaEm?: string;
  publicadaPor?: string;
}
