import { supabase } from './client';

const TIPO_FOLLOWUP_FALLBACK = 'workspace_orcamento_v1';

export type DisciplinaWorkspace = 'eletrica' | 'hidraulica' | 'incendio' | 'gas' | 'spda' | 'dados' | 'outros';

export interface AreaWorkspace {
  id: string;
  nome: string;
  metragem: number;
  disciplinas: DisciplinaWorkspace[];
  criadoEm: string;
}

export interface ItemEscopoWorkspace {
  id: string;
  codigo: string;
  disciplina: DisciplinaWorkspace;
  local: string;
  titulo: string;
  quantidade: number;
  unidade: string;
  inclui: string;
  exclui: string;
  premissas: string;
  observacao: string;
  criadoEm: string;
}

export interface CotacaoWorkspace {
  id: string;
  itemEscopoId: string | null;
  itemTitulo: string;
  fornecedor: string;
  valor: number;
  prazo: string;
  pagamento: string;
  validade: string;
  considerada: boolean;
  criadoEm: string;
}

export interface DocumentoWorkspace {
  id: string;
  nome: string;
  status: string;
  link: string;
  criadoEm: string;
}

export interface HistoricoWorkspace {
  id: string;
  tipo: string;
  responsavel: string;
  impacto: string;
  descricao: string;
  criadoEm: string;
}

export interface EstrategiaWorkspace {
  tipo: 'economica' | 'recomendada' | 'premium' | 'marca_exigida';
  justificativa: string;
  valorSugerido: number;
}

export interface OrcamentoWorkspaceDados {
  versao: number;
  areas: AreaWorkspace[];
  escopo: ItemEscopoWorkspace[];
  cotacoes: CotacaoWorkspace[];
  documentos: DocumentoWorkspace[];
  historico: HistoricoWorkspace[];
  estrategia: EstrategiaWorkspace;
}

export interface OrcamentoWorkspaceRow {
  id: string;
  proposta_id: string;
  dados: OrcamentoWorkspaceDados;
  atualizado_por: string | null;
  atualizado_em: string;
  criado_em: string;
}

export function criarWorkspacePadrao(): OrcamentoWorkspaceDados {
  return {
    versao: 1,
    areas: [],
    escopo: [],
    cotacoes: [],
    documentos: [],
    historico: [],
    estrategia: {
      tipo: 'recomendada',
      justificativa: 'Melhor equilíbrio entre prazo, padrão técnico e defesa comercial.',
      valorSugerido: 0,
    },
  };
}

function normalizarDados(raw: unknown): OrcamentoWorkspaceDados {
  const base = criarWorkspacePadrao();
  const dados = (raw && typeof raw === 'object' ? raw : {}) as Partial<OrcamentoWorkspaceDados>;
  return {
    ...base,
    ...dados,
    areas: Array.isArray(dados.areas) ? dados.areas : [],
    escopo: Array.isArray(dados.escopo) ? dados.escopo : [],
    cotacoes: Array.isArray(dados.cotacoes) ? dados.cotacoes : [],
    documentos: Array.isArray(dados.documentos) ? dados.documentos : [],
    historico: Array.isArray(dados.historico) ? dados.historico : [],
    estrategia: { ...base.estrategia, ...(dados.estrategia || {}) },
  };
}


function tabelaWorkspaceAusente(error: any): boolean {
  const texto = [
    error?.code,
    error?.message,
    error?.details,
    error?.hint,
  ].filter(Boolean).join(' ').toLowerCase();

  return (
    texto.includes('orcamento_workspace') &&
    (
      texto.includes('schema cache') ||
      texto.includes('could not find the table') ||
      texto.includes('relation') ||
      texto.includes('does not exist') ||
      texto.includes('42p01') ||
      texto.includes('pgrst205')
    )
  );
}

function serializarFallback(dados: OrcamentoWorkspaceDados) {
  return JSON.stringify({
    origem: 'orcamento_workspace_fallback',
    versao: 1,
    salvoEm: new Date().toISOString(),
    dados,
  });
}

function extrairFallback(raw: unknown): OrcamentoWorkspaceDados {
  if (!raw || typeof raw !== 'string') return criarWorkspacePadrao();
  try {
    const parsed = JSON.parse(raw);
    return normalizarDados(parsed?.dados ?? parsed);
  } catch {
    return criarWorkspacePadrao();
  }
}

async function buscarFallbackEmFollowUps(propostaId: string): Promise<OrcamentoWorkspaceDados> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('id,resumo')
    .eq('proposta_id', propostaId)
    .eq('tipo', TIPO_FOLLOWUP_FALLBACK)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return criarWorkspacePadrao();
  return extrairFallback((data as { resumo?: string | null }).resumo ?? '');
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function buscarFallbacksEmFollowUps(propostaIds: string[]): Promise<Record<string, OrcamentoWorkspaceDados>> {
  const resultado: Record<string, OrcamentoWorkspaceDados> = {};
  if (!propostaIds.length) return resultado;

  for (const ids of chunkArray(propostaIds, 300)) {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('proposta_id,resumo,created_at')
      .in('proposta_id', ids)
      .eq('tipo', TIPO_FOLLOWUP_FALLBACK)
      .order('created_at', { ascending: false });

    if (error) throw error;

    for (const row of data || []) {
      const propostaId = String((row as { proposta_id?: string | null }).proposta_id || '');
      if (!propostaId || resultado[propostaId]) continue;
      resultado[propostaId] = extrairFallback((row as { resumo?: string | null }).resumo ?? '');
    }
  }

  return resultado;
}

async function salvarFallbackEmFollowUps(
  propostaId: string,
  dados: OrcamentoWorkspaceDados,
  atualizadoPor?: string | null
): Promise<OrcamentoWorkspaceDados> {
  const existente = await supabase
    .from('follow_ups')
    .select('id')
    .eq('proposta_id', propostaId)
    .eq('tipo', TIPO_FOLLOWUP_FALLBACK)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existente.error) throw existente.error;

  const payload = {
    proposta_id: propostaId,
    tipo: TIPO_FOLLOWUP_FALLBACK,
    data: new Date().toISOString().slice(0, 10),
    responsavel: atualizadoPor || 'Sistema',
    resumo: serializarFallback(dados),
    proxima_acao: null,
    data_proxima_acao: null,
    arquivo: null,
  };

  if ((existente.data as { id?: string } | null)?.id) {
    const { error } = await supabase
      .from('follow_ups')
      .update(payload)
      .eq('id', (existente.data as { id: string }).id);
    if (error) throw error;
    return normalizarDados(dados);
  }

  const { error } = await supabase
    .from('follow_ups')
    .insert(payload);

  if (error) throw error;
  return normalizarDados(dados);
}

export const orcamentoWorkspaceRepository = {
  async buscar(propostaId: string): Promise<OrcamentoWorkspaceDados> {
    const { data, error } = await supabase
      .from('orcamento_workspace')
      .select('*')
      .eq('proposta_id', propostaId)
      .maybeSingle();

    if (error) {
      if (tabelaWorkspaceAusente(error)) return buscarFallbackEmFollowUps(propostaId);
      throw error;
    }
    if (!data) return criarWorkspacePadrao();
    return normalizarDados((data as OrcamentoWorkspaceRow).dados);
  },

  async listarPorPropostas(propostaIds: string[]): Promise<Record<string, OrcamentoWorkspaceDados>> {
    const idsUnicos = [...new Set(propostaIds.filter(Boolean))];
    const resultado: Record<string, OrcamentoWorkspaceDados> = {};
    if (!idsUnicos.length) return resultado;

    for (const ids of chunkArray(idsUnicos, 300)) {
      const { data, error } = await supabase
        .from('orcamento_workspace')
        .select('proposta_id,dados')
        .in('proposta_id', ids);

      if (error) {
        if (tabelaWorkspaceAusente(error)) return buscarFallbacksEmFollowUps(idsUnicos);
        throw error;
      }

      for (const row of data || []) {
        const propostaId = String((row as { proposta_id?: string | null }).proposta_id || '');
        if (!propostaId) continue;
        resultado[propostaId] = normalizarDados((row as { dados?: unknown }).dados);
      }
    }

    return resultado;
  },

  async salvar(propostaId: string, dados: OrcamentoWorkspaceDados, atualizadoPor?: string | null): Promise<OrcamentoWorkspaceDados> {
    const payload = {
      proposta_id: propostaId,
      dados,
      atualizado_por: atualizadoPor ?? null,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('orcamento_workspace')
      .upsert(payload, { onConflict: 'proposta_id' })
      .select('*')
      .single();

    if (error) {
      if (tabelaWorkspaceAusente(error)) return salvarFallbackEmFollowUps(propostaId, dados, atualizadoPor);
      throw error;
    }
    return normalizarDados((data as OrcamentoWorkspaceRow).dados);
  },
};

