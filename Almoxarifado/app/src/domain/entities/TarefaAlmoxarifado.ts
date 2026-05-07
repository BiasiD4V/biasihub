export type TarefaAlmoxarifadoStatus =
  | 'a_fazer'
  | 'em_andamento'
  | 'aguardando'
  | 'concluido'
  | 'cancelado';

export type TarefaAlmoxarifadoPrioridade =
  | 'baixa'
  | 'media'
  | 'alta'
  | 'urgente';

export type TarefaAlmoxarifadoTipo =
  | 'separacao_material'
  | 'entrega_obra'
  | 'conferencia_estoque'
  | 'recebimento_material'
  | 'organizacao_almoxarifado'
  | 'controle_ferramentas'
  | 'manutencao_veiculo'
  | 'compra_solicitacao_material'
  | 'inventario'
  | 'outro';

export interface TarefaAlmoxarifado {
  id: string;
  title: string;
  description: string;
  type: TarefaAlmoxarifadoTipo;
  priority: TarefaAlmoxarifadoPrioridade;
  status: TarefaAlmoxarifadoStatus;
  responsibleUserId?: string | null;
  responsibleName: string;
  responsibleEmail?: string | null;
  obraId?: string | null;
  obraNome?: string | null;
  relatedRequisitionId?: string | null;
  relatedRequisitionLabel?: string | null;
  relatedRequisitionStatus?: string | null;
  dueDate?: string | null;
  observations: string;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  canceledAt?: string | null;
}

export interface TarefaAlmoxarifadoHistorico {
  id: string;
  taskId: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface TarefaAlmoxarifadoUsuario {
  id: string;
  nome: string;
  email?: string | null;
  papel?: string | null;
  ativo?: boolean | null;
  departamento?: string | null;
}

export interface TarefaAlmoxarifadoObra {
  id: string;
  nome: string;
  origem?: 'cadastro' | 'rastreio';
}

export interface TarefaAlmoxarifadoRastreio {
  id: string;
  obra: string;
  status: string;
  solicitanteNome?: string | null;
  criadoEm?: string | null;
  label: string;
}
