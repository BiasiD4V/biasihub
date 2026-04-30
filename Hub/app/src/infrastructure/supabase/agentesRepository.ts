import type {
  AcaoFilaAgente,
  AtualizarStatusFilaInput,
  CriarItemFilaInput,
  ExecucaoAgente,
  FluxoAgente,
  ItemFilaAgente,
  MetricasOperacaoAgente,
  PainelOperacaoAgente,
  PrioridadeFila,
  StatusExecucao,
  StatusFila,
} from '../../domain/entities/AgenteOperacao';
import { supabase } from './client';

interface FluxoRow {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tabela_origem: string;
  tabela_destino: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface FilaRow {
  id: string;
  fluxo_id: string;
  entidade_tipo: string;
  entidade_id: string;
  origem: string;
  status: string;
  prioridade: string;
  payload: Record<string, any> | null;
  resultado: Record<string, any> | null;
  erro: string | null;
  reservado_por: string | null;
  reservado_em: string | null;
  tentativas: number | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface ExecucaoRow {
  id: string;
  fila_id: string | null;
  fluxo_id: string;
  agente_nome: string;
  origem_executor: string;
  status: string;
  entrada: Record<string, any> | null;
  saida: Record<string, any> | null;
  erro: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
}

interface AcaoRow {
  id: string;
  fila_id: string;
  execucao_id: string | null;
  ator_tipo: string;
  ator_id: string | null;
  ator_nome: string | null;
  acao: string;
  detalhes: Record<string, any> | null;
  criado_em: string;
}

function normalizeStatusFila(value: string): StatusFila {
  if (
    value === 'novo' ||
    value === 'processando' ||
    value === 'aguardando_aprovacao' ||
    value === 'concluido' ||
    value === 'erro' ||
    value === 'cancelado'
  ) {
    return value;
  }
  return 'novo';
}

function normalizePrioridade(value: string): PrioridadeFila {
  if (value === 'baixa' || value === 'media' || value === 'alta' || value === 'critica') return value;
  return 'media';
}

function normalizeStatusExecucao(value: string): StatusExecucao {
  if (value === 'iniciado' || value === 'concluido' || value === 'erro') return value;
  return 'iniciado';
}

function isMissingSchema(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('relation') ||
    message.includes('agente_fluxos') ||
    message.includes('agente_fila') ||
    message.includes('agente_execucoes') ||
    message.includes('agente_acoes')
  );
}

function friendlyError(error: any) {
  if (isMissingSchema(error)) {
    return 'Tabelas da operacao de agentes nao encontradas no Supabase. Rode o script scripts/agents_center.sql.';
  }

  const code = String(error?.code || '');
  if (code === '42501') {
    return 'Sem permissao para acessar a operacao de agentes no Supabase. Ajuste as politicas RLS.';
  }

  return String(error?.message || error || 'Erro ao acessar operacao de agentes.');
}

function mapMetricas(fila: ItemFilaAgente[]): MetricasOperacaoAgente {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  return {
    fluxosAtivos: 0,
    itensPendentes: fila.filter(
      (item) => item.status === 'novo' || item.status === 'aguardando_aprovacao'
    ).length,
    itensProcessando: fila.filter((item) => item.status === 'processando').length,
    itensComErro: fila.filter((item) => item.status === 'erro').length,
    itensConcluidos24h: fila.filter(
      (item) => item.status === 'concluido' && new Date(item.atualizadoEm).getTime() >= last24h
    ).length,
  };
}

async function carregarPainel(): Promise<PainelOperacaoAgente> {
  const [
    { data: fluxosData, error: fluxosError },
    { data: filaData, error: filaError },
    { data: execucoesData, error: execucoesError },
    { data: acoesData, error: acoesError },
  ] = await Promise.all([
    supabase.from('agente_fluxos').select('*').order('nome', { ascending: true }),
    supabase.from('agente_fila').select('*').order('atualizado_em', { ascending: false }).limit(200),
    supabase.from('agente_execucoes').select('*').order('iniciado_em', { ascending: false }).limit(200),
    supabase.from('agente_acoes').select('*').order('criado_em', { ascending: false }).limit(400),
  ]);

  if (fluxosError) throw fluxosError;
  if (filaError) throw filaError;
  if (execucoesError) throw execucoesError;
  if (acoesError) throw acoesError;

  const fluxosRows = (fluxosData ?? []) as FluxoRow[];
  const filaRows = (filaData ?? []) as FilaRow[];
  const execucoesRows = (execucoesData ?? []) as ExecucaoRow[];
  const acoesRows = (acoesData ?? []) as AcaoRow[];

  const userIds = [...new Set(filaRows.map((row) => row.criado_por).filter(Boolean))] as string[];
  const userMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id,nome')
      .in('id', userIds);
    if (usuariosError) throw usuariosError;
    (usuariosData ?? []).forEach((row: any) => {
      userMap.set(String(row.id), String(row.nome || ''));
    });
  }

  const ultimoProcessamentoPorFluxo = new Map<string, string>();
  execucoesRows.forEach((run) => {
    const current = ultimoProcessamentoPorFluxo.get(run.fluxo_id);
    if (!current || new Date(run.iniciado_em).getTime() > new Date(current).getTime()) {
      ultimoProcessamentoPorFluxo.set(run.fluxo_id, run.iniciado_em);
    }
  });

  const pendenciasPorFluxo = new Map<string, number>();
  filaRows.forEach((row) => {
    const status = normalizeStatusFila(String(row.status || 'novo'));
    if (status === 'concluido' || status === 'cancelado') return;
    pendenciasPorFluxo.set(row.fluxo_id, (pendenciasPorFluxo.get(row.fluxo_id) || 0) + 1);
  });

  const fluxos: FluxoAgente[] = fluxosRows.map((row) => ({
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    descricao: row.descricao || '',
    tabelaOrigem: row.tabela_origem,
    tabelaDestino: row.tabela_destino,
    ativo: Boolean(row.ativo),
    pendencias: pendenciasPorFluxo.get(row.id) || 0,
    ultimoProcessamentoEm: ultimoProcessamentoPorFluxo.get(row.id) || null,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  }));

  const fluxoNomeById = new Map(fluxos.map((item) => [item.id, item.nome]));

  const fila: ItemFilaAgente[] = filaRows.map((row) => ({
    id: row.id,
    fluxoId: row.fluxo_id,
    fluxoNome: fluxoNomeById.get(row.fluxo_id) || 'Fluxo sem nome',
    entidadeTipo: row.entidade_tipo,
    entidadeId: row.entidade_id,
    origem: row.origem,
    status: normalizeStatusFila(String(row.status || 'novo')),
    prioridade: normalizePrioridade(String(row.prioridade || 'media')),
    payload: row.payload || {},
    resultado: row.resultado || null,
    erro: row.erro || null,
    reservadoPor: row.reservado_por || null,
    reservadoEm: row.reservado_em || null,
    tentativas: Number(row.tentativas || 0),
    criadoPor: row.criado_por || null,
    criadoPorNome: userMap.get(String(row.criado_por || '')) || 'Sem usuario',
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  }));

  const execucoes: ExecucaoAgente[] = execucoesRows.map((row) => ({
    id: row.id,
    filaId: row.fila_id,
    fluxoId: row.fluxo_id,
    fluxoNome: fluxoNomeById.get(row.fluxo_id) || 'Fluxo sem nome',
    agenteNome: row.agente_nome,
    origemExecutor: row.origem_executor,
    status: normalizeStatusExecucao(String(row.status || 'iniciado')),
    entrada: row.entrada || {},
    saida: row.saida || {},
    erro: row.erro || null,
    iniciadoEm: row.iniciado_em,
    finalizadoEm: row.finalizado_em,
  }));

  const acoes: AcaoFilaAgente[] = acoesRows.map((row) => ({
    id: row.id,
    filaId: row.fila_id,
    execucaoId: row.execucao_id,
    atorTipo:
      row.ator_tipo === 'usuario' || row.ator_tipo === 'agente' || row.ator_tipo === 'sistema'
        ? row.ator_tipo
        : 'sistema',
    atorId: row.ator_id,
    atorNome: row.ator_nome || 'Sem nome',
    acao: row.acao,
    detalhes: row.detalhes || {},
    criadoEm: row.criado_em,
  }));

  const metricas = mapMetricas(fila);
  metricas.fluxosAtivos = fluxos.filter((item) => item.ativo).length;

  return {
    fonte: 'supabase',
    fluxos,
    fila,
    execucoes,
    acoes,
    metricas,
  };
}

export const agentesRepository = {
  async listarPainel(): Promise<PainelOperacaoAgente> {
    try {
      return await carregarPainel();
    } catch (error: any) {
      throw new Error(friendlyError(error));
    }
  },

  async criarItemFila(input: CriarItemFilaInput): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      const { error } = await supabase.from('agente_fila').insert({
        fluxo_id: input.fluxoId,
        entidade_tipo: input.entidadeTipo,
        entidade_id: input.entidadeId,
        origem: input.origem,
        prioridade: input.prioridade,
        payload: input.payload || {},
        status: 'novo',
        criado_por: input.usuarioId,
      });
      if (error) throw error;

      const { data: itemCriado, error: itemError } = await supabase
        .from('agente_fila')
        .select('id')
        .eq('fluxo_id', input.fluxoId)
        .eq('entidade_tipo', input.entidadeTipo)
        .eq('entidade_id', input.entidadeId)
        .eq('criado_por', input.usuarioId)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!itemError && itemCriado?.id) {
        await supabase.from('agente_acoes').insert({
          fila_id: itemCriado.id,
          ator_tipo: 'usuario',
          ator_id: input.usuarioId,
          ator_nome: input.usuarioNome,
          acao: 'item_criado',
          detalhes: {
            origem: input.origem,
            prioridade: input.prioridade,
          },
        });
      }

      return { sucesso: true };
    } catch (error: any) {
      return { sucesso: false, erro: friendlyError(error) };
    }
  },

  async atualizarStatusFila(input: AtualizarStatusFilaInput): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      const patch: Record<string, any> = {
        status: input.status,
      };

      if (input.status !== 'processando') {
        patch.reservado_por = null;
        patch.reservado_em = null;
      }

      if (input.resultado) {
        patch.resultado = input.resultado;
      }

      if (input.status === 'erro') {
        patch.erro = input.observacao || 'Erro informado pelo operador';
      } else if (input.observacao) {
        patch.erro = null;
      }

      const { error } = await supabase.from('agente_fila').update(patch).eq('id', input.itemId);
      if (error) throw error;

      const { error: actionError } = await supabase.from('agente_acoes').insert({
        fila_id: input.itemId,
        ator_tipo: 'usuario',
        ator_id: input.usuarioId,
        ator_nome: input.usuarioNome,
        acao: input.acao,
        detalhes: {
          observacao: input.observacao || '',
          status: input.status,
          resultado: input.resultado || null,
        },
      });
      if (actionError) throw actionError;

      return { sucesso: true };
    } catch (error: any) {
      return { sucesso: false, erro: friendlyError(error) };
    }
  },

  assinarMudancas(callback: () => void): () => void {
    const channel = supabase
      .channel('agente-operacao-painel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agente_fluxos' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agente_fila' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agente_execucoes' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agente_acoes' }, callback)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
