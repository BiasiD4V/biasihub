export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'reprovado';

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
}

export interface ItemOrcamento {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
}

export interface Orcamento {
  id: string;
  numero: string;
  cliente: Cliente;
  itens: ItemOrcamento[];
  status: StatusOrcamento;
  dataCriacao: string;
  observacoes: string;
}
