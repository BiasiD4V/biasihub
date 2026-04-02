import { createContext, useContext, useState, type ReactNode } from 'react';
import { mockOrcamentos as mockOrcsDominio } from '../infrastructure/mock/dados/orcamentos.mock';
import { mockDemandas } from '../infrastructure/mock/dados/demandas.mock';
import { mockClientes } from '../infrastructure/mock/dados/clientes.mock';
import { mockTiposObra } from '../infrastructure/mock/dados/tiposObra.mock';
import { mockDisciplinas } from '../infrastructure/mock/dados/disciplinas.mock';
import { mockFollowUps } from '../infrastructure/mock/dados/followups.mock';
import { mockPendencias } from '../infrastructure/mock/dados/pendencias.mock';
import { mockMudancasEtapa } from '../infrastructure/mock/dados/mudancasEtapa.mock';
import { mockQualificacoes } from '../infrastructure/mock/dados/qualificacoes.mock';
import type { StatusRevisao } from '../domain/value-objects/StatusRevisao';
import { STATUS_LABELS } from '../domain/value-objects/StatusRevisao';
import type { EtapaFunil } from '../domain/value-objects/EtapaFunil';
import { ETAPA_LABELS } from '../domain/value-objects/EtapaFunil';
import type { ResultadoComercial } from '../domain/value-objects/ResultadoComercial';
import type {
  QualificacaoOportunidade,
  NivelAltoMedioBaixo,
  NivelAltaMediaBaixa,
  SimNao,
  AtualizarQualificacaoInput,
} from '../domain/value-objects/QualificacaoOportunidade';
import type { FollowUp } from '../domain/entities/FollowUp';
import type { Pendencia } from '../domain/entities/Pendencia';
import type { MudancaEtapa } from '../domain/entities/MudancaEtapa';

export type { AtualizarQualificacaoInput };

export interface OrcamentoCard {
  id: string;
  numero: string;
  titulo: string;
  clienteId: string;
  clienteNome: string;
  tiposObraIds: string[];
  tiposObraNomes: string[];
  disciplinaIds: string[];
  disciplinaNomes: string[];
  dataBase: string;
  responsavel: string;
  status: StatusRevisao | 'rascunho';
  statusLabel: string;
  criadoEm: string;
  // Campos CRM Sprint 1
  etapaAtual: string;
  proximaAcao: string;
  dataProximaAcao: string;
  ultimaInteracao: string;
  pendenciasAbertas: number;
  // Campos CRM Sprint 2
  etapaFunil: EtapaFunil;
  resultadoComercial: ResultadoComercial;
  motivoPerda?: string;
  dataEnvioProposta?: string;
  dataFechamento?: string;
  valorProposta?: number;
  // Campos Qualificação (Sprint Pareto 1)
  fitTecnico?: NivelAltoMedioBaixo;
  clarezaDocumentos?: NivelAltaMediaBaixa;
  urgencia?: NivelAltaMediaBaixa;
  chanceFechamento?: NivelAltaMediaBaixa;
  valorEstrategico?: NivelAltoMedioBaixo;
  clienteEstrategico?: SimNao;
  prazoResposta?: string;
  observacaoComercial?: string;
  // Campos Fase 1
  linkArquivo?: string;
}

export interface CriarOrcamentoInput {
  titulo: string;
  clienteId: string;
  tiposObraIds: string[];
  dataBase: string;
  responsavel: string;
  disciplinaIds: string[];
}

export interface AtualizarComercialInput {
  etapaFunil?: EtapaFunil;
  resultadoComercial?: ResultadoComercial;
  motivoPerda?: string;
  dataEnvioProposta?: string;
  dataFechamento?: string;
  valorProposta?: number;
  linkArquivo?: string;
}

interface NovoOrcamentoContextType {
  orcamentos: OrcamentoCard[];
  criarOrcamento: (input: CriarOrcamentoInput) => string;
  buscarOrcamento: (id: string) => OrcamentoCard | null;
  followUps: FollowUp[];
  pendencias: Pendencia[];
  mudancasEtapa: MudancaEtapa[];
  qualificacoes: QualificacaoOportunidade[];
  adicionarFollowUp: (input: Omit<FollowUp, 'id'>) => void;
  adicionarPendencia: (input: Omit<Pendencia, 'id' | 'criadaEm'>) => void;
  resolverPendencia: (id: string) => void;
  buscarFollowUps: (orcamentoId: string) => FollowUp[];
  buscarPendencias: (orcamentoId: string) => Pendencia[];
  buscarMudancasEtapa: (orcamentoId: string) => MudancaEtapa[];
  atualizarProximaAcao: (orcamentoId: string, acao: string, data: string) => void;
  atualizarEtapaFunil: (
    orcamentoId: string,
    etapaNova: EtapaFunil,
    responsavel: string,
    observacao?: string
  ) => void;
  atualizarComercial: (orcamentoId: string, dados: AtualizarComercialInput) => void;
  atualizarQualificacao: (orcamentoId: string, dados: AtualizarQualificacaoInput) => void;
}

// Seeds de etapa funil (sobrescreve derivação de mudancas)
const ETAPA_FUNIL_SEED: Record<string, EtapaFunil> = {
  orc1: 'pos_venda',
  orc2: 'montagem_orcamento',
  orc3: 'proposta_enviada',
  orc4: 'levantamento',
};

const RESULTADO_SEED: Record<string, ResultadoComercial> = {
  orc1: 'ganho',
  orc2: 'em_andamento',
  orc3: 'em_andamento',
  orc4: 'em_andamento',
};

const RESPONSAVEL_SEED: Record<string, string> = {
  orc1: 'Paulo Confar',
  orc2: 'Paulo Confar',
  orc3: 'Lucas Mendes',
  orc4: 'Paulo Melo',
};

const VALOR_PROPOSTA_SEED: Record<string, number> = {
  orc1: 142500,
  orc3: 87300,
};

const LINK_ARQUIVO_SEED: Record<string, string> = {
  orc1: '\\\\FILESERVER\\COMERCIAL\\1 - ORÇAMENTOS\\2024\\ORC-2024-001 - Reforma Galpão 2',
  orc3: '\\\\FILESERVER\\COMERCIAL\\1 - ORÇAMENTOS\\2024\\ORC-2024-003 - Subestação',
};

function construirSeeds(
  fups: FollowUp[],
  pends: Pendencia[],
  mudancas: MudancaEtapa[],
  quals: QualificacaoOportunidade[]
): OrcamentoCard[] {
  return mockOrcsDominio.map((orc) => {
    const demanda = mockDemandas.find((d) => d.id === orc.demandaId);
    const cliente = demanda
      ? mockClientes.find((c) => c.id === demanda.clienteId)
      : null;
    const tiposObraNomes = (demanda?.tiposObraIds ?? []).map(
      (id) => mockTiposObra.find((t) => t.id === id)?.nome ?? id
    );
    const ultimaRevisao = orc.revisoes[orc.revisoes.length - 1];
    const statusRevisao = ultimaRevisao?.status;
    const status: StatusRevisao | 'rascunho' = statusRevisao ?? 'rascunho';
    const statusLabel = statusRevisao
      ? (STATUS_LABELS[statusRevisao] ?? statusRevisao)
      : 'Rascunho';

    // Campos CRM Sprint 1
    const pendenciasAbertas = pends.filter(
      (p) => p.orcamentoId === orc.id && p.status === 'aberta'
    ).length;
    const fupsDesteOrc = fups
      .filter((f) => f.orcamentoId === orc.id)
      .sort((a, b) => b.data.localeCompare(a.data));
    const ultimaInteracao = fupsDesteOrc[0]?.data ?? orc.criadoEm;
    const ultimoFup = fupsDesteOrc[0];

    // Campos CRM Sprint 2
    const mudancasDesteOrc = mudancas
      .filter((m) => m.orcamentoId === orc.id)
      .sort((a, b) => b.data.localeCompare(a.data));
    const etapaFunil: EtapaFunil = ETAPA_FUNIL_SEED[orc.id] ??
      (mudancasDesteOrc[0]?.etapaNova ?? 'entrada_oportunidade');
    const resultadoComercial: ResultadoComercial = RESULTADO_SEED[orc.id] ?? 'em_andamento';

    // Data envio proposta: última mudança para 'proposta_enviada'
    const mudancaProposta = mudancasDesteOrc
      .find((m) => m.etapaNova === 'proposta_enviada');
    // Data fechamento: última mudança para 'pos_venda' (etapa que representa ganho)
    // ou definida via atualizarComercial quando resultado = 'perdido'
    const mudancaFechamento = mudancasDesteOrc
      .find((m) => m.etapaNova === 'pos_venda');

    // Qualificação da oportunidade (Sprint Pareto 1)
    const qual = quals.find((q) => q.orcamentoId === orc.id);

    return {
      id: orc.id,
      numero: orc.numero,
      titulo: orc.titulo,
      clienteId: demanda?.clienteId ?? '',
      clienteNome: cliente?.razaoSocial ?? '—',
      tiposObraIds: demanda?.tiposObraIds ?? [],
      tiposObraNomes,
      disciplinaIds: [],
      disciplinaNomes: [],
      dataBase: orc.criadoEm.slice(0, 10),
      responsavel: RESPONSAVEL_SEED[orc.id] ?? 'Paulo Confar',
      status,
      statusLabel,
      criadoEm: orc.criadoEm,
      etapaAtual: ETAPA_LABELS[etapaFunil],
      proximaAcao: ultimoFup?.proximaAcao ?? '',
      dataProximaAcao: ultimoFup?.dataProximaAcao ?? '',
      ultimaInteracao,
      pendenciasAbertas,
      etapaFunil,
      resultadoComercial,
      dataEnvioProposta: mudancaProposta?.data.slice(0, 10),
      dataFechamento: mudancaFechamento?.data.slice(0, 10),
      valorProposta: VALOR_PROPOSTA_SEED[orc.id],
      linkArquivo: LINK_ARQUIVO_SEED[orc.id],
      // Qualificação
      fitTecnico: qual?.fitTecnico,
      clarezaDocumentos: qual?.clarezaDocumentos,
      urgencia: qual?.urgencia,
      chanceFechamento: qual?.chanceFechamento,
      valorEstrategico: qual?.valorEstrategico,
      clienteEstrategico: qual?.clienteEstrategico,
      prazoResposta: qual?.prazoResposta,
      observacaoComercial: qual?.observacaoComercial,
    };
  });
}

const NovoOrcamentoContext = createContext<NovoOrcamentoContextType | null>(null);

export function NovoOrcamentoProvider({ children }: { children: ReactNode }) {
  const [followUps, setFollowUps] = useState<FollowUp[]>(() => [...mockFollowUps]);
  const [pendencias, setPendencias] = useState<Pendencia[]>(() => [...mockPendencias]);
  const [mudancasEtapa, setMudancasEtapa] = useState<MudancaEtapa[]>(
    () => [...mockMudancasEtapa]
  );
  const [qualificacoes, setQualificacoes] = useState<QualificacaoOportunidade[]>(
    () => structuredClone(mockQualificacoes)
  );
  const [lista, setLista] = useState<OrcamentoCard[]>(() =>
    construirSeeds(mockFollowUps, mockPendencias, mockMudancasEtapa, mockQualificacoes)
  );

  function criarOrcamento(input: CriarOrcamentoInput): string {
    const id = `orc-${Date.now()}`;
    const ano = new Date().getFullYear();
    const numero = `ORC-${ano}-${String(lista.length + 1).padStart(3, '0')}`;
    const cliente = mockClientes.find((c) => c.id === input.clienteId);
    const tiposObraNomes = input.tiposObraIds.map(
      (tId) => mockTiposObra.find((t) => t.id === tId)?.nome ?? tId
    );
    const disciplinaNomes = input.disciplinaIds.map(
      (dId) => mockDisciplinas.find((d) => d.id === dId)?.nome ?? dId
    );

    const agora = new Date().toISOString();
    const novo: OrcamentoCard = {
      id,
      numero,
      titulo: input.titulo,
      clienteId: input.clienteId,
      clienteNome: cliente?.razaoSocial ?? '—',
      tiposObraIds: input.tiposObraIds,
      tiposObraNomes,
      disciplinaIds: input.disciplinaIds,
      disciplinaNomes,
      dataBase: input.dataBase,
      responsavel: input.responsavel,
      status: 'em_elaboracao',
      statusLabel: STATUS_LABELS['em_elaboracao'],
      criadoEm: agora,
      etapaAtual: ETAPA_LABELS['entrada_oportunidade'],
      proximaAcao: '',
      dataProximaAcao: '',
      ultimaInteracao: agora,
      pendenciasAbertas: 0,
      etapaFunil: 'entrada_oportunidade',
      resultadoComercial: 'em_andamento',
      // Qualificação vazia — preenchida via atualizarQualificacao após criação
      fitTecnico: undefined,
      clarezaDocumentos: undefined,
      urgencia: undefined,
      chanceFechamento: undefined,
      valorEstrategico: undefined,
      clienteEstrategico: undefined,
      prazoResposta: undefined,
      observacaoComercial: undefined,
      linkArquivo: undefined,
    };

    // Registra mudança inicial de etapa
    const mudancaInicial: MudancaEtapa = {
      id: `me-${Date.now()}`,
      orcamentoId: id,
      etapaAnterior: null,
      etapaNova: 'entrada_oportunidade',
      responsavel: input.responsavel || 'Paulo Confar',
      observacao: 'Oportunidade criada.',
      data: agora,
      status: 'aprovado',
    };
    setMudancasEtapa((prev) => [...prev, mudancaInicial]);

    setLista((prev) => [novo, ...prev]);
    return id;
  }

  function buscarOrcamento(id: string): OrcamentoCard | null {
    return lista.find((o) => o.id === id) ?? null;
  }

  function adicionarFollowUp(input: Omit<FollowUp, 'id'>): void {
    const novoFup: FollowUp = { ...input, id: `fu-${Date.now()}` };
    setFollowUps((prev) => [...prev, novoFup]);

    // Atualiza ultimaInteracao e (se houver) proximaAcao no card
    setLista((prev) =>
      prev.map((orc) => {
        if (orc.id !== input.orcamentoId) return orc;
        const atualizado: OrcamentoCard = {
          ...orc,
          ultimaInteracao: input.data,
        };
        if (input.proximaAcao) {
          atualizado.proximaAcao = input.proximaAcao;
          atualizado.dataProximaAcao = input.dataProximaAcao ?? '';
        }
        return atualizado;
      })
    );
  }

  function adicionarPendencia(input: Omit<Pendencia, 'id' | 'criadaEm'>): void {
    const novaPend: Pendencia = {
      ...input,
      id: `pen-${Date.now()}`,
      criadaEm: new Date().toISOString(),
    };
    setPendencias((prev) => [...prev, novaPend]);

    if (input.status === 'aberta') {
      setLista((prev) =>
        prev.map((orc) =>
          orc.id === input.orcamentoId
            ? { ...orc, pendenciasAbertas: orc.pendenciasAbertas + 1 }
            : orc
        )
      );
    }
  }

  function resolverPendencia(id: string): void {
    let orcamentoId: string | null = null;

    setPendencias((prev) =>
      prev.map((p) => {
        if (p.id === id && p.status === 'aberta') {
          orcamentoId = p.orcamentoId;
          return { ...p, status: 'resolvida' as const };
        }
        return p;
      })
    );

    if (orcamentoId) {
      const oId = orcamentoId;
      setLista((prev) =>
        prev.map((orc) =>
          orc.id === oId
            ? { ...orc, pendenciasAbertas: Math.max(0, orc.pendenciasAbertas - 1) }
            : orc
        )
      );
    }
  }

  function buscarFollowUps(orcamentoId: string): FollowUp[] {
    return followUps
      .filter((f) => f.orcamentoId === orcamentoId)
      .sort((a, b) => b.data.localeCompare(a.data));
  }

  function buscarPendencias(orcamentoId: string): Pendencia[] {
    return pendencias.filter((p) => p.orcamentoId === orcamentoId);
  }

  function buscarMudancasEtapa(orcamentoId: string): MudancaEtapa[] {
    return mudancasEtapa
      .filter((m) => m.orcamentoId === orcamentoId)
      .sort((a, b) => b.data.localeCompare(a.data));
  }

  function atualizarProximaAcao(orcamentoId: string, acao: string, data: string): void {
    setLista((prev) =>
      prev.map((orc) =>
        orc.id === orcamentoId
          ? { ...orc, proximaAcao: acao, dataProximaAcao: data }
          : orc
      )
    );
  }

  function atualizarEtapaFunil(
    orcamentoId: string,
    etapaNova: EtapaFunil,
    responsavel: string,
    observacao?: string
  ): void {
    const orc = lista.find((o) => o.id === orcamentoId);
    if (!orc) return;

    const novaMudanca: MudancaEtapa = {
      id: `me-${Date.now()}`,
      orcamentoId,
      etapaAnterior: orc.etapaFunil,
      etapaNova,
      responsavel,
      observacao,
      data: new Date().toISOString(),
      status: 'aprovado',
    };
    setMudancasEtapa((prev) => [...prev, novaMudanca]);

    setLista((prev) =>
      prev.map((o) => {
        if (o.id !== orcamentoId) return o;
        return {
          ...o,
          etapaFunil: etapaNova,
          etapaAtual: ETAPA_LABELS[etapaNova],
          // resultado comercial NÃO muda automaticamente ao trocar etapa —
          // é alterado exclusivamente via atualizarComercial (modal de fechamento)
          dataEnvioProposta:
            etapaNova === 'proposta_enviada'
              ? new Date().toISOString().slice(0, 10)
              : o.dataEnvioProposta,
        };
      })
    );
  }

  function atualizarComercial(orcamentoId: string, dados: AtualizarComercialInput): void {
    setLista((prev) =>
      prev.map((orc) => {
        if (orc.id !== orcamentoId) return orc;
        const atualizado: OrcamentoCard = { ...orc, ...dados };
        if (dados.etapaFunil) {
          atualizado.etapaAtual = ETAPA_LABELS[dados.etapaFunil];
        }
        return atualizado;
      })
    );
  }

  function atualizarQualificacao(orcamentoId: string, dados: AtualizarQualificacaoInput): void {
    const agora = new Date().toISOString();

    setQualificacoes((prev) => {
      const existe = prev.find((q) => q.orcamentoId === orcamentoId);
      if (existe) {
        return prev.map((q) =>
          q.orcamentoId === orcamentoId
            ? { ...q, ...dados, atualizadoEm: agora }
            : q
        );
      }
      // Cria nova qualificação com defaults mínimos
      const nova: QualificacaoOportunidade = {
        orcamentoId,
        fitTecnico: 'medio',
        clarezaDocumentos: 'media',
        urgencia: 'media',
        chanceFechamento: 'media',
        clienteEstrategico: 'nao',
        ...dados,
        atualizadoEm: agora,
      };
      return [...prev, nova];
    });

    // Sincroniza no OrcamentoCard
    setLista((prev) =>
      prev.map((orc) =>
        orc.id === orcamentoId ? { ...orc, ...dados } : orc
      )
    );
  }

  return (
    <NovoOrcamentoContext.Provider
      value={{
        orcamentos: lista,
        criarOrcamento,
        buscarOrcamento,
        followUps,
        pendencias,
        mudancasEtapa,
        qualificacoes,
        adicionarFollowUp,
        adicionarPendencia,
        resolverPendencia,
        buscarFollowUps,
        buscarPendencias,
        buscarMudancasEtapa,
        atualizarProximaAcao,
        atualizarEtapaFunil,
        atualizarComercial,
        atualizarQualificacao,
      }}
    >
      {children}
    </NovoOrcamentoContext.Provider>
  );
}

export function useNovoOrcamento() {
  const ctx = useContext(NovoOrcamentoContext);
  if (!ctx) throw new Error('useNovoOrcamento must be used within NovoOrcamentoProvider');
  return ctx;
}
