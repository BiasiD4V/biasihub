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
  bloqueado_solicitacao?: boolean | null;
  bloqueio_motivo?: string | null;
  bloqueio_observacao?: string | null;
  bloqueado_em?: string | null;
  bloqueado_por?: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
