import type {
  TarefaAlmoxarifado,
  TarefaAlmoxarifadoHistorico,
  TarefaAlmoxarifadoObra,
  TarefaAlmoxarifadoPrioridade,
  TarefaAlmoxarifadoRastreio,
  TarefaAlmoxarifadoStatus,
  TarefaAlmoxarifadoTipo,
  TarefaAlmoxarifadoUsuario,
} from '../../domain/entities/TarefaAlmoxarifado';
import { supabase } from './client';

export interface TarefaAlmoxarifadoInput {
  title: string;
  description: string;
  type: TarefaAlmoxarifadoTipo;
  priority: TarefaAlmoxarifadoPrioridade;
  status: TarefaAlmoxarifadoStatus;
  responsibleName: string;
  responsibleUserId?: string | null;
  obraId?: string | null;
  obraNome?: string | null;
  relatedRequisitionId?: string | null;
  dueDate?: string | null;
  observations: string;
}

type RawUsuario = {
  id: string;
  nome: string;
  email?: string | null;
  papel?: string | null;
  ativo?: boolean | null;
  departamento?: string | null;
};

type RawObra = {
  id: string;
  nome: string;
};

type RawTarefa = {
  id: string;
  title: string;
  description: string | null;
  type: TarefaAlmoxarifadoTipo;
  priority: TarefaAlmoxarifadoPrioridade;
  status: TarefaAlmoxarifadoStatus;
  responsible_user_id?: string | null;
  responsible_name?: string | null;
  obra_id?: string | null;
  obra_name?: string | null;
  related_requisition_id?: string | null;
  due_date?: string | null;
  observations?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  canceled_at?: string | null;
  responsible?: RawUsuario | RawUsuario[] | null;
  creator?: RawUsuario | RawUsuario[] | null;
  obra?: RawObra | RawObra[] | null;
  requisicao?: RawRequisicao | RawRequisicao[] | null;
};

type RawRequisicao = {
  id: string;
  obra?: string | null;
  status?: string | null;
  solicitante_nome?: string | null;
  criado_em?: string | null;
  itens?: unknown;
};

type RawHistorico = {
  id: string;
  task_id: string;
  user_id?: string | null;
  action: string;
  old_value?: string | null;
  new_value?: string | null;
  created_at: string;
  user?: RawUsuario | RawUsuario[] | null;
};

const TAREFA_SELECT = `
  id,
  title,
  description,
  type,
  priority,
  status,
  responsible_user_id,
  responsible_name,
  obra_id,
  obra_name,
  related_requisition_id,
  due_date,
  observations,
  created_by,
  created_at,
  updated_at,
  completed_at,
  canceled_at,
  responsible:usuarios!tarefas_almox_responsible_user_id_fkey(id,nome,email,papel,ativo,departamento),
  creator:usuarios!tarefas_almox_created_by_fkey(id,nome,email),
  obra:obras!tarefas_almox_obra_id_fkey(id,nome),
  requisicao:requisicoes_almoxarifado!tarefas_almox_related_requisition_id_fkey(id,obra,status,solicitante_nome,criado_em,itens)
`;

const HISTORICO_SELECT = `
  id,
  task_id,
  user_id,
  action,
  old_value,
  new_value,
  created_at,
  user:usuarios(id,nome,email)
`;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapTarefa(raw: RawTarefa): TarefaAlmoxarifado {
  const responsible = first(raw.responsible);
  const creator = first(raw.creator);
  const obra = first(raw.obra);
  const requisicao = first(raw.requisicao);
  const requisicaoLabel = requisicao
    ? `${requisicao.obra || 'Sem obra'} - ${requisicao.status || 'sem status'}`
    : null;

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? '',
    type: raw.type,
    priority: raw.priority,
    status: raw.status,
    responsibleUserId: raw.responsible_user_id ?? null,
    responsibleName: raw.responsible_name || responsible?.nome || 'Sem responsavel',
    responsibleEmail: responsible?.email ?? null,
    obraId: raw.obra_id ?? null,
    obraNome: raw.obra_name || obra?.nome || requisicao?.obra || null,
    relatedRequisitionId: raw.related_requisition_id ?? null,
    relatedRequisitionLabel: requisicaoLabel,
    relatedRequisitionStatus: requisicao?.status ?? null,
    dueDate: raw.due_date ?? null,
    observations: raw.observations ?? '',
    createdBy: raw.created_by ?? null,
    createdByName: creator?.nome ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    completedAt: raw.completed_at ?? null,
    canceledAt: raw.canceled_at ?? null,
  };
}

function mapHistorico(raw: RawHistorico): TarefaAlmoxarifadoHistorico {
  const user = first(raw.user);

  return {
    id: raw.id,
    taskId: raw.task_id,
    userId: raw.user_id ?? null,
    userName: user?.nome ?? null,
    action: raw.action,
    oldValue: raw.old_value ?? null,
    newValue: raw.new_value ?? null,
    createdAt: raw.created_at,
  };
}

function toPayload(input: TarefaAlmoxarifadoInput, createdBy?: string | null) {
  const now = new Date().toISOString();
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    priority: input.priority,
    status: input.status,
    responsible_user_id: input.responsibleUserId || null,
    responsible_name: input.responsibleName.trim(),
    obra_id: input.obraId || null,
    obra_name: input.obraNome?.trim() || null,
    related_requisition_id: input.relatedRequisitionId || null,
    due_date: input.dueDate || null,
    observations: input.observations.trim(),
    created_by: createdBy ?? undefined,
    completed_at: input.status === 'concluido' ? now : null,
    canceled_at: input.status === 'cancelado' ? now : null,
  };
}

async function registrarHistorico(
  taskId: string,
  userId: string | null | undefined,
  action: string,
  oldValue?: string | null,
  newValue?: string | null,
) {
  const { error } = await supabase
    .from('tarefas_almoxarifado_historico')
    .insert({
      task_id: taskId,
      user_id: userId ?? null,
      action,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
    });

  if (error) {
    console.warn('[KanbanAlmox] falha ao registrar historico:', error);
  }
}

function historicoAlteracoes(
  atual: TarefaAlmoxarifado,
  input: TarefaAlmoxarifadoInput,
  usuarios: TarefaAlmoxarifadoUsuario[],
) {
  const responsavelNovo = input.responsibleName.trim()
    || usuarios.find((u) => u.id === input.responsibleUserId)?.nome
    || 'Sem responsavel';
  const alteracoes: Array<{ action: string; oldValue?: string | null; newValue?: string | null }> = [];

  if (atual.status !== input.status) {
    alteracoes.push({ action: 'status_changed', oldValue: atual.status, newValue: input.status });
  }
  if ((atual.responsibleName ?? '') !== input.responsibleName.trim() || (atual.responsibleUserId ?? '') !== (input.responsibleUserId ?? '')) {
    alteracoes.push({ action: 'responsible_changed', oldValue: atual.responsibleName, newValue: responsavelNovo });
  }
  if (atual.priority !== input.priority) {
    alteracoes.push({ action: 'priority_changed', oldValue: atual.priority, newValue: input.priority });
  }
  if ((atual.dueDate ?? '') !== (input.dueDate ?? '')) {
    alteracoes.push({ action: 'due_date_changed', oldValue: atual.dueDate ?? null, newValue: input.dueDate ?? null });
  }
  if ((atual.obraNome ?? '') !== (input.obraNome ?? '').trim()) {
    alteracoes.push({ action: 'obra_changed', oldValue: atual.obraNome ?? null, newValue: input.obraNome?.trim() ?? null });
  }
  if ((atual.relatedRequisitionId ?? '') !== (input.relatedRequisitionId ?? '')) {
    alteracoes.push({ action: 'requisition_link_changed', oldValue: atual.relatedRequisitionId ?? null, newValue: input.relatedRequisitionId ?? null });
  }

  return alteracoes.length > 0 ? alteracoes : [{ action: 'updated' }];
}

export const tarefasAlmoxarifadoRepository = {
  async listarTarefas(): Promise<TarefaAlmoxarifado[]> {
    const { data, error } = await supabase
      .from('tarefas_almoxarifado')
      .select(TAREFA_SELECT)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return ((data || []) as RawTarefa[]).map(mapTarefa);
  },

  async listarUsuarios(): Promise<TarefaAlmoxarifadoUsuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id,nome,email,papel,ativo,departamento')
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;
    return (data || []) as TarefaAlmoxarifadoUsuario[];
  },

  async listarObras(): Promise<TarefaAlmoxarifadoObra[]> {
    const [obrasRes, requisicoesRes] = await Promise.all([
      supabase
      .from('obras')
      .select('id,nome')
        .order('nome'),
      supabase
        .from('requisicoes_almoxarifado')
        .select('obra')
        .not('obra', 'is', null)
        .order('atualizado_em', { ascending: false })
        .limit(200),
    ]);

    if (obrasRes.error) throw obrasRes.error;
    if (requisicoesRes.error) throw requisicoesRes.error;

    const mapa = new Map<string, TarefaAlmoxarifadoObra>();
    (obrasRes.data || []).forEach((obra: RawObra) => {
      if (obra.nome?.trim()) mapa.set(obra.nome.trim().toLowerCase(), { ...obra, origem: 'cadastro' });
    });
    (requisicoesRes.data || []).forEach((row: { obra?: string | null }) => {
      const nome = row.obra?.trim();
      if (nome && !mapa.has(nome.toLowerCase())) {
        mapa.set(nome.toLowerCase(), { id: nome, nome, origem: 'rastreio' });
      }
    });

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  async listarRastreios(): Promise<TarefaAlmoxarifadoRastreio[]> {
    const { data, error } = await supabase
      .from('requisicoes_almoxarifado')
      .select('id,obra,status,solicitante_nome,criado_em,itens')
      .order('atualizado_em', { ascending: false })
      .limit(120);

    if (error) throw error;

    return ((data || []) as RawRequisicao[])
      .filter((row) => row.id && row.obra)
      .map((row) => {
        const itens = Array.isArray(row.itens) ? row.itens.length : 0;
        const final = row.solicitante_nome
          ? `${row.obra} - ${row.status || 'sem status'} - ${row.solicitante_nome}`
          : `${row.obra} - ${row.status || 'sem status'}`;
        return {
          id: row.id,
          obra: row.obra || '',
          status: row.status || 'sem status',
          solicitanteNome: row.solicitante_nome ?? null,
          criadoEm: row.criado_em ?? null,
          label: `${final}${itens ? ` - ${itens} item(ns)` : ''}`,
        };
      });
  },

  async listarHistorico(taskId: string): Promise<TarefaAlmoxarifadoHistorico[]> {
    const { data, error } = await supabase
      .from('tarefas_almoxarifado_historico')
      .select(HISTORICO_SELECT)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return ((data || []) as RawHistorico[]).map(mapHistorico);
  },

  async criarTarefa(input: TarefaAlmoxarifadoInput, userId?: string | null): Promise<TarefaAlmoxarifado> {
    const { data, error } = await supabase
      .from('tarefas_almoxarifado')
      .insert(toPayload(input, userId))
      .select(TAREFA_SELECT)
      .single();

    if (error) throw error;
    const tarefa = mapTarefa(data as RawTarefa);
    await registrarHistorico(tarefa.id, userId, 'created', null, tarefa.title);
    return tarefa;
  },

  async atualizarTarefa(
    atual: TarefaAlmoxarifado,
    input: TarefaAlmoxarifadoInput,
    userId: string | null | undefined,
    usuarios: TarefaAlmoxarifadoUsuario[],
  ): Promise<TarefaAlmoxarifado> {
    const { data, error } = await supabase
      .from('tarefas_almoxarifado')
      .update(toPayload(input))
      .eq('id', atual.id)
      .select(TAREFA_SELECT)
      .single();

    if (error) throw error;
    const tarefa = mapTarefa(data as RawTarefa);
    const alteracoes = historicoAlteracoes(atual, input, usuarios);
    await Promise.all(
      alteracoes.map((item) =>
        registrarHistorico(tarefa.id, userId, item.action, item.oldValue, item.newValue),
      ),
    );
    return tarefa;
  },

  async moverTarefa(
    atual: TarefaAlmoxarifado,
    status: TarefaAlmoxarifadoStatus,
    userId?: string | null,
  ): Promise<TarefaAlmoxarifado> {
    const { data, error } = await supabase
      .from('tarefas_almoxarifado')
      .update({
        status,
        completed_at: status === 'concluido' ? new Date().toISOString() : null,
        canceled_at: status === 'cancelado' ? new Date().toISOString() : null,
      })
      .eq('id', atual.id)
      .select(TAREFA_SELECT)
      .single();

    if (error) throw error;
    const tarefa = mapTarefa(data as RawTarefa);
    await registrarHistorico(tarefa.id, userId, 'status_changed', atual.status, status);
    return tarefa;
  },

  async excluirTarefa(id: string): Promise<void> {
    const { error } = await supabase
      .from('tarefas_almoxarifado')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
