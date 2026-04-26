export type StatusRequisicao = 'pendente' | 'aprovada' | 'entregue' | 'cancelada';

export interface RequisicaoItem {
  item_id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
}

export interface Requisicao {
  id: string;
  solicitante_id: string;
  obra: string;
  status: StatusRequisicao;
  itens: RequisicaoItem[];
  observacao: string | null;
  data_solicitacao: string;
  data_aprovacao: string | null;
  aprovado_por_id: string | null;
  criado_em: string;
  atualizado_em: string;
  // Separação (almoxarifado) — opcionais; podem não existir nas migrações antigas
  iniciado_em?: string | null;
  finalizado_em?: string | null;
  separador_id?: string | null;
  // join
  solicitante?: { nome: string };
  aprovado_por?: { nome: string };
  separador?: { nome: string };
}
