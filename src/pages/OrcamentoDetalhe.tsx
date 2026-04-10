import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Building, Tag, Clock, CheckCircle, XCircle, FolderOpen, Edit2, Save, X, Copy, Trash2 } from 'lucide-react';
import { useNovoOrcamento } from '../context/NovoOrcamentoContext';
import { useAuth } from '../context/AuthContext';
import { StatusBadgeNovo } from '../components/ui/StatusBadgeNovo';
import { TimelineFollowUp } from '../components/orcamentos/TimelineFollowUp';
import { BlocoPendencias } from '../components/orcamentos/BlocoPendencias';
import { BlocoComercial } from '../components/orcamentos/BlocoComercial';
import { BlocoQualificacao } from '../components/orcamentos/BlocoQualificacao';
import { HistoricoEtapas } from '../components/orcamentos/HistoricoEtapas';
import { AlertasOrcamento } from '../components/orcamentos/AlertasOrcamento';
import { ModalNovoFollowUp } from '../components/orcamentos/ModalNovoFollowUp';
import { ModalNovaPendencia } from '../components/orcamentos/ModalNovaPendencia';
import { MapaJornadaComercial } from '../components/orcamentos/MapaJornadaComercial';
import { gamificacaoService } from '../services/gamificacaoService';
import { supabase } from '../infrastructure/supabase/client';

import { propostasRepository, type PropostaSupabase, type MudancaEtapaRow, type FollowUpRow } from '../infrastructure/supabase/propostasRepository';
import type { FollowUp } from '../domain/entities/FollowUp';
import type { MudancaEtapa } from '../domain/entities/MudancaEtapa';
import type { Pendencia } from '../domain/entities/Pendencia';
import type { DadosFechamento } from '../components/orcamentos/ModalFechamentoComercial';
import type { AtualizarQualificacaoInput } from '../context/NovoOrcamentoContext';
import type { OrcamentoCard } from '../context/NovoOrcamentoContext';
import { calcularPrioridade, PRIORIDADE_CONFIG, calcularScoreABC, PRIORIDADE_ABC_CONFIG } from '../utils/prioridade';
import { formatarData } from '../utils/datas';
import type { StatusRevisao } from '../domain/value-objects/StatusRevisao';
import type { EtapaFunil } from '../domain/value-objects/EtapaFunil';
import { ETAPA_CORES } from '../domain/value-objects/EtapaFunil';
import type { ResultadoComercial } from '../domain/value-objects/ResultadoComercial';
import { RESULTADO_CORES } from '../domain/value-objects/ResultadoComercial';

const ETAPA_DEFAULT: EtapaFunil = 'entrada_oportunidade';
const RESULTADO_DEFAULT: ResultadoComercial = 'em_andamento';

/* === localStorage helpers para persistência quando tabelas Supabase não existem === */
function lsKey(propostaId: string, tipo: 'mudancas' | 'followups' | 'pendencias') {
  return `biasi_${tipo}_${propostaId}`;
}
function lsGetMudancas(propostaId: string): MudancaEtapa[] {
  try { return JSON.parse(localStorage.getItem(lsKey(propostaId, 'mudancas')) || '[]'); } catch { return []; }
}
function lsSaveMudancas(propostaId: string, items: MudancaEtapa[]) {
  try { localStorage.setItem(lsKey(propostaId, 'mudancas'), JSON.stringify(items)); } catch { /* */ }
}
function lsGetFollowUps(propostaId: string): FollowUp[] {
  try { return JSON.parse(localStorage.getItem(lsKey(propostaId, 'followups')) || '[]'); } catch { return []; }
}
function lsSaveFollowUps(propostaId: string, items: FollowUp[]) {
  try { localStorage.setItem(lsKey(propostaId, 'followups'), JSON.stringify(items)); } catch { /* */ }
}
function lsGetPendencias(propostaId: string): Pendencia[] {
  try { return JSON.parse(localStorage.getItem(lsKey(propostaId, 'pendencias')) || '[]'); } catch { return []; }
}

function assinaturaMudanca(m: MudancaEtapa): string {
  return [
    m.orcamentoId,
    m.etapaAnterior ?? '',
    m.etapaNova,
    m.responsavel,
    m.data,
    m.observacao ?? '',
    m.arquivo ?? '',
  ].join('|');
}

function assinaturaFollowUp(f: FollowUp): string {
  return [
    f.orcamentoId,
    f.tipo,
    f.data,
    f.responsavel,
    f.resumo,
    f.proximaAcao ?? '',
    f.dataProximaAcao ?? '',
    f.arquivo ?? '',
  ].join('|');
}

function mesclarMudancas(remotas: MudancaEtapa[], locais: MudancaEtapa[]): MudancaEtapa[] {
  const vistos = new Set<string>();
  const merged: MudancaEtapa[] = [];

  for (const item of remotas) {
    const assinatura = assinaturaMudanca(item);
    if (!vistos.has(assinatura)) {
      vistos.add(assinatura);
      merged.push(item);
    }
  }
  for (const item of locais) {
    const assinatura = assinaturaMudanca(item);
    if (!vistos.has(assinatura)) {
      vistos.add(assinatura);
      merged.push(item);
    }
  }
  return merged.sort((a, b) => b.data.localeCompare(a.data));
}

function mesclarFollowUps(remotos: FollowUp[], locais: FollowUp[]): FollowUp[] {
  const vistos = new Set<string>();
  const merged: FollowUp[] = [];

  for (const item of remotos) {
    const assinatura = assinaturaFollowUp(item);
    if (!vistos.has(assinatura)) {
      vistos.add(assinatura);
      merged.push(item);
    }
  }
  for (const item of locais) {
    const assinatura = assinaturaFollowUp(item);
    if (!vistos.has(assinatura)) {
      vistos.add(assinatura);
      merged.push(item);
    }
  }
  return merged.sort((a, b) => b.data.localeCompare(a.data));
}

function etapaSegura(v: string | null): EtapaFunil {
  if (v && v in ETAPA_CORES) return v as EtapaFunil;
  return ETAPA_DEFAULT;
}
function resultadoSeguro(v: string | null): ResultadoComercial {
  if (v && v in RESULTADO_CORES) return v as ResultadoComercial;
  return RESULTADO_DEFAULT;
}

function rowParaMudanca(r: MudancaEtapaRow): MudancaEtapa {
  return {
    id: r.id,
    orcamentoId: r.proposta_id,
    etapaAnterior: r.etapa_anterior as EtapaFunil | null,
    etapaNova: r.etapa_nova as EtapaFunil,
    responsavel: r.responsavel,
    observacao: r.observacao ?? undefined,
    arquivo: r.arquivo ?? undefined,
    data: r.created_at,
    status: (r.status as 'aprovado' | 'pendente') || 'aprovado',
  };
}

function rowParaFollowUp(r: FollowUpRow): FollowUp {
  return {
    id: r.id,
    orcamentoId: r.proposta_id,
    tipo: (r.tipo || 'observacao') as FollowUp['tipo'],
    data: r.data,
    responsavel: r.responsavel,
    resumo: r.resumo,
    arquivo: r.arquivo ?? undefined,
    proximaAcao: r.proxima_acao ?? undefined,
    dataProximaAcao: r.data_proxima_acao ?? undefined,
  };
}

/* Helper: converte PropostaSupabase → OrcamentoCard (parcial) */
function propostaParaOrc(p: PropostaSupabase): OrcamentoCard {
  const etapa = etapaSegura(p.etapa_funil);
  const resultado = resultadoSeguro(p.resultado_comercial);
  return {
    id: p.id,
    numero: p.numero_composto,
    titulo: [p.cliente, p.obra].filter(Boolean).join(' — ') || p.numero_composto,
    clienteId: '',
    clienteNome: p.cliente || '—',
    tiposObraIds: [],
    tiposObraNomes: p.tipo ? [p.tipo] : [],
    disciplinaIds: [],
    disciplinaNomes: p.disciplina ? [p.disciplina] : [],
    dataBase: p.data_entrada || '',
    responsavel: p.responsavel || '',
    status: (p.status === 'FECHADO' ? 'aprovado' : p.status === 'ENVIADO' ? 'enviado' : 'rascunho') as StatusRevisao | 'rascunho',
    statusLabel: p.status || 'Rascunho',
    criadoEm: p.created_at,
    etapaAtual: etapa,
    proximaAcao: p.proxima_acao || '',
    dataProximaAcao: p.data_proxima_acao || '',
    ultimaInteracao: p.ultima_interacao || new Date().toISOString().slice(0, 10),
    pendenciasAbertas: 0,
    etapaFunil: etapa,
    resultadoComercial: resultado,
    motivoPerda: undefined,
    dataEnvioProposta: undefined,
    dataFechamento: undefined,
    valorProposta: p.valor_orcado ?? undefined,
    chanceFechamento: (p.chance_fechamento as any) ?? undefined,
    urgencia: (p.urgencia as any) ?? undefined,
    observacaoComercial: p.observacao_comercial ?? undefined,
    fitTecnico: (p.fit_tecnico as any) ?? undefined,
    clarezaDocumentos: (p.clareza_documentos as any) ?? undefined,
    valorEstrategico: (p.valor_estrategico as any) ?? undefined,
    clienteEstrategico: (p.cliente_estrategico as any) ?? undefined,
    prazoResposta: p.prazo_resposta ?? undefined,
    linkArquivo: p.link_arquivo ?? undefined,
    responsavelComercial: (p as any).responsavel_comercial ?? undefined,
  };
}

export function OrcamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const {
    buscarOrcamento,
    buscarFollowUps,
    buscarPendencias,
    buscarMudancasEtapa,
    resolverPendencia,
    atualizarEtapaFunil,
    atualizarComercial,
    atualizarQualificacao,
  } = useNovoOrcamento();
  
  const [modalFollowUpAberto, setModalFollowUpAberto] = useState(false);
  const [modalPendenciaAberto, setModalPendenciaAberto] = useState(false);
  const [editandoLink, setEditandoLink] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');
  const [linkInput, setLinkInput] = useState('');

  // Tentar do mock primeiro
  const orcMock = id ? buscarOrcamento(id) : null;

  // Se não achou no mock, buscar do Supabase
  const [propostaSupa, setPropostaSupa] = useState<PropostaSupabase | null>(null);
  const [carregando, setCarregando] = useState(!orcMock && !!id);

  const [localFollowUps, setLocalFollowUps] = useState<FollowUp[]>([]);
  const [localMudancas, setLocalMudancas] = useState<MudancaEtapa[]>([]);
  const [localPendencias, setLocalPendencias] = useState<Pendencia[]>([]);

  useEffect(() => {
    if (orcMock || !id) return;
    let cancelado = false;
    setCarregando(true);
    
    Promise.all([
      propostasRepository.buscarPorId(id),
      propostasRepository.listarMudancasEtapa(id),
      propostasRepository.listarFollowUps(id),
      propostasRepository.listarPendencias(id),
    ]).then(([p, mudancas, fups, pends]) => {
      if (!cancelado) {
        setPropostaSupa(p);
        const locaisMudancas = lsGetMudancas(id);
        const locaisFollowUps = lsGetFollowUps(id);
        const m = mesclarMudancas(mudancas.map(rowParaMudanca), locaisMudancas);
        const f = mesclarFollowUps(fups.map(rowParaFollowUp), locaisFollowUps);
        lsSaveMudancas(id, m);
        lsSaveFollowUps(id, f);
        setLocalMudancas(m);
        setLocalFollowUps(f);
        setLocalPendencias(pends);
        setCarregando(false);
      }
    }).catch(() => {
      if (!cancelado) {
        setLocalMudancas(lsGetMudancas(id));
        setLocalFollowUps(lsGetFollowUps(id));
        setLocalPendencias(lsGetPendencias(id));
        setCarregando(false);
      }
    });

    // ── Supabase Realtime ───────────────────────────────────────────
    const channel = supabase
      .channel(`orcamento-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'propostas', 
        filter: `id=eq.${id}` 
      }, (payload) => {
        if (!cancelado) setPropostaSupa(payload.new as PropostaSupabase);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'mudancas_etapa', 
        filter: `proposta_id=eq.${id}` 
      }, () => {
        if (!cancelado) {
          propostasRepository.listarMudancasEtapa(id).then(mudancas => {
            const m = mesclarMudancas(mudancas.map(rowParaMudanca), lsGetMudancas(id));
            setLocalMudancas(m);
            lsSaveMudancas(id, m);
          });
        }
      })
      .subscribe();

    return () => { 
      cancelado = true; 
      supabase.removeChannel(channel);
    };
  }, [id, orcMock]);

  const orc: OrcamentoCard | null = orcMock ?? (propostaSupa ? propostaParaOrc(propostaSupa) : null);
  const isSupa = !orcMock && !!propostaSupa;

  const followUps = isSupa ? localFollowUps : (id ? buscarFollowUps(id) : []);
  const pendencias = isSupa ? localPendencias : (id ? buscarPendencias(id) : []);
  const mudancasEtapa = isSupa ? localMudancas : (id ? buscarMudancasEtapa(id) : []);

  if (carregando) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center gap-4">
          <button onClick={() => navigate('/orcamentos')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!orc) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center gap-4">
          <button onClick={() => navigate('/orcamentos')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">Orçamento não encontrado.</p>
        </div>
      </div>
    );
  }

  function handleMudarEtapa(etapaNova: EtapaFunil, observacao?: string, arquivoUrl?: string, skipHistorico?: boolean, etapaAnteriorOverride?: EtapaFunil) {
    if (!id) return;
    const executor = usuario?.nome || orc?.responsavel || 'Usuário';

    if (isSupa) {
      const etapaAnterior = etapaAnteriorOverride ?? orc?.etapaFunil ?? null;
      const papelAtual = usuario?.papel;
      const autoAprovado = papelAtual && ['dono', 'admin', 'gestor'].includes(papelAtual);
      const statusMudanca = autoAprovado ? 'aprovado' : 'pendente';

      if (executor) gamificacaoService.registrarAtividadePorEtapa(executor, etapaNova).catch(console.error);
      propostasRepository.atualizar(id, { etapa_funil: etapaNova }).then((p) => {
        setPropostaSupa(p);
      }).catch(() => {});

      if (skipHistorico) return;

      const novaMudanca: MudancaEtapa = {
        id: crypto.randomUUID(),
        orcamentoId: id,
        etapaAnterior: etapaAnterior as EtapaFunil | null,
        etapaNova,
        responsavel: executor,
        observacao,
        arquivo: arquivoUrl,
        data: new Date().toISOString(),
        status: statusMudanca,
      };
      
      const tempId = novaMudanca.id;
      setLocalMudancas((prev) => {
        const next = [novaMudanca, ...prev];
        lsSaveMudancas(id, next);
        return next;
      });

      propostasRepository.inserirMudancaEtapa({
        proposta_id: id,
        etapa_anterior: etapaAnterior,
        etapa_nova: etapaNova,
        responsavel: executor,
        observacao: observacao ?? null,
        arquivo: arquivoUrl ?? null,
        status: statusMudanca,
      }).then((dbRow) => {
        if (dbRow) {
          const fromDb = rowParaMudanca(dbRow);
          setLocalMudancas((prev) => {
            const next = prev.map((m) => m.id === tempId ? fromDb : m);
            lsSaveMudancas(id, next);
            return next;
          });
        }
      }).catch(() => {});
    } else {
      if (executor) gamificacaoService.registrarAtividadePorEtapa(executor, etapaNova).catch(console.error);
      atualizarEtapaFunil(id, etapaNova, executor, observacao);
    }
  }

  function handleAtualizarValor(valor: number) {
    if (!id) return;
    if (isSupa) {
      propostasRepository.atualizar(id, { valor_orcado: valor }).then((p) => {
        setPropostaSupa(p);
      }).catch(() => {});
    } else {
      atualizarComercial(id, { valorProposta: valor });
    }
  }

  function handleQualificacao(dados: AtualizarQualificacaoInput) {
    if (!id) return;
    if (isSupa) {
      propostasRepository.atualizar(id, {
        chance_fechamento: dados.chanceFechamento ?? null,
        urgencia: dados.urgencia ?? null,
        observacao_comercial: dados.observacaoComercial ?? null,
        fit_tecnico: dados.fitTecnico ?? null,
        clareza_documentos: dados.clarezaDocumentos ?? null,
        valor_estrategico: dados.valorEstrategico ?? null,
        cliente_estrategico: dados.clienteEstrategico ?? null,
        prazo_resposta: dados.prazoResposta ?? null,
      }).then((p) => { setPropostaSupa(p); }).catch(() => {});
    } else {
      atualizarQualificacao(id, dados);
    }
  }

  function handleSalvarLink() {
    if (!id) return;
    if (isSupa) {
      propostasRepository.atualizar(id, { link_arquivo: linkInput.trim() || null })
        .then((p) => { setPropostaSupa(p); })
        .catch(() => {});
      setEditandoLink(false);
    } else {
      atualizarComercial(id, { linkArquivo: linkInput.trim() });
      setEditandoLink(false);
    }
  }

  function handleFechamento(dados: DadosFechamento) {
    if (!id) return;
    const executor = usuario?.nome || orc?.responsavel || 'Usuário';

    if (isSupa) {
      const update = dados.resultado === 'ganho'
        ? { resultado_comercial: 'ganho', etapa_funil: 'pos_venda', valor_orcado: dados.valorFechado }
        : { resultado_comercial: 'perdido' };
      
      if (dados.resultado === 'ganho' && executor) {
        gamificacaoService.registrarAtividadeDireta(executor, 'contrato_fechado').catch(console.error);
      }
      propostasRepository.atualizar(id, update).then((p) => { setPropostaSupa(p); }).catch(() => {});
    } else {
      if (dados.resultado === 'ganho') {
        atualizarComercial(id, {resultadoComercial: 'ganho'});
        if (executor) gamificacaoService.registrarAtividadeDireta(executor, 'contrato_fechado').catch(console.error);
      } else {
        atualizarComercial(id, {
          resultadoComercial: 'perdido',
          dataFechamento: dados.dataFechamento,
          motivoPerda: dados.motivoPerda,
        });
      }
    }
  }

  async function handleResolverPendencia(pendenciaId: string) {
    if (isSupa) {
      const snapshot = localPendencias;
      setLocalPendencias((prev) => {
        return prev.map((p) =>
          p.id === pendenciaId && p.status === 'aberta'
            ? { ...p, status: 'resolvida' as const }
            : p
        )
      });
      const ok = await propostasRepository.resolverPendencia(pendenciaId);
      if (!ok) setLocalPendencias(snapshot);
    } else {
      resolverPendencia(pendenciaId);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="px-3 py-3 sm:px-8 sm:py-4 border-b border-slate-200 bg-white flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => navigate('/orcamentos')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Voltar</span>
        </button>
        <span className="text-slate-300 hidden sm:inline">|</span>
        <span className="font-mono text-xs sm:text-sm text-slate-500 flex-shrink-0">{orc.numero}</span>
        <StatusBadgeNovo
          status={orc.status as StatusRevisao | 'rascunho'}
          label={orc.statusLabel}
        />
        <h1 className="text-sm sm:text-lg font-bold text-slate-800 truncate">{orc.titulo}</h1>
        {(() => {
          const abc = calcularScoreABC(orc);
          if (!abc) return null;
          const cfg = PRIORIDADE_ABC_CONFIG[abc.classe];
          return (
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border flex-shrink-0 ${cfg.bg} ${cfg.border}`}>
              <span className={`text-base font-bold leading-none ${cfg.text}`}>{abc.classe}</span>
              <span className={`text-xs font-medium ${cfg.text}`}>{abc.score}/10</span>
            </div>
          );
        })()}
        <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <AlertasOrcamento orc={orc} />
          {usuario?.papel && ['dono', 'admin', 'gestor'].includes(usuario.papel) && isSupa && (
            confirmarExclusao ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">
                  {erroExclusao ? erroExclusao : 'Excluir orçamento?'}
                </span>
                <button
                  onClick={async () => {
                    if (!id) return;
                    setExcluindo(true);
                    setErroExclusao('');
                    try {
                      await propostasRepository.deletar(id);
                      navigate('/orcamentos');
                    } catch (e: any) {
                      setErroExclusao(e?.message ?? 'Erro ao excluir');
                      setExcluindo(false);
                    }
                  }}
                  disabled={excluindo}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  {excluindo ? 'Excluindo...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setConfirmarExclusao(false)}
                  disabled={excluindo}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmarExclusao(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                title="Excluir orçamento"
              >
                <Trash2 size={13} />
                Excluir
              </button>
            )
          )}
        </div>
      </div>

      {/* Meta strip */}
      <div className={`px-3 py-2 sm:px-8 sm:py-3 border-b border-slate-200 ${
        orc.resultadoComercial === 'ganho' ? 'bg-green-50' : 
        orc.resultadoComercial === 'perdido' ? 'bg-red-50' : 'bg-slate-50'
      }`}>
        <div className="flex items-center gap-3 sm:gap-8 text-sm flex-wrap overflow-x-auto no-scrollbar">
          {orc.resultadoComercial === 'ganho' && (
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
              <span className="text-green-700 text-xs font-semibold">Ganho</span>
            </div>
          )}
          {orc.resultadoComercial === 'perdido' && (
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-red-500 flex-shrink-0" />
              <span className="text-red-600 text-xs font-semibold">Perdido</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Etapa</span>
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {orc.etapaAtual}
            </span>
          </div>
          {orc.responsavel && (
            <div className="flex items-center gap-2">
              <User size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500 text-xs">Responsável:</span>
              <span className="text-slate-600 text-xs font-medium">{orc.responsavel}</span>
            </div>
          )}
          {orc.responsavelComercial && (
            <div className="flex items-center gap-2">
              <User size={14} className="text-blue-400 flex-shrink-0" />
              <span className="text-slate-500 text-xs">Comercial:</span>
              <span className="text-blue-600 text-xs font-medium">{orc.responsavelComercial}</span>
            </div>
          )}
          {orc.resultadoComercial === 'em_andamento' && (
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 text-xs max-w-[240px] truncate">
                {orc.proximaAcao || 'Nenhuma ação pendente'}
              </span>
            </div>
          )}
          {orc.dataProximaAcao && orc.resultadoComercial === 'em_andamento' && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 text-xs">
                {formatarData(orc.dataProximaAcao)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 sm:p-8 overflow-y-auto">
        {(() => {
          const prioridade = calcularPrioridade(orc);
          if (!prioridade || prioridade === 'baixa') return null;
          const cfg = PRIORIDADE_CONFIG[prioridade];
          return (
            <div className={`flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border ${cfg.bg} border-opacity-60 ${
              prioridade === 'alta' ? 'border-red-200' : 'border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className={`text-xs font-semibold ${cfg.text}`}>Prioridade {cfg.label}</span>
              <span className="text-slate-300 text-xs">•</span>
              <AlertasOrcamento orc={orc} />
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TimelineFollowUp
              followUps={followUps}
              onRegistrar={() => setModalFollowUpAberto(true)}
              onUpdateFollowUp={(updatedFup) => {
                if (isSupa && id) {
                  setLocalFollowUps(prev => {
                    const next = prev.map(f => f.id === updatedFup.id ? updatedFup : f);
                    lsSaveFollowUps(id, next);
                    return next;
                  });
                  propostasRepository.atualizarFollowUp(updatedFup.id, {
                    resumo: updatedFup.resumo,
                    proxima_acao: updatedFup.proximaAcao || null,
                    data_proxima_acao: updatedFup.dataProximaAcao || null,
                    arquivo: updatedFup.arquivo || null,
                  }).catch(() => {});
                }
              }}
              onDeleteFollowUp={(fupId) => {
                if (isSupa && id) {
                  setLocalFollowUps(prev => {
                    const next = prev.filter(f => f.id !== fupId);
                    lsSaveFollowUps(id, next);
                    return next;
                  });
                  propostasRepository.deletarFollowUp(fupId).catch(() => {});
                }
              }}
            />

            <HistoricoEtapas 
              mudancas={mudancasEtapa}
              papelUsuario={usuario?.papel}
              onUpdateMudanca={(updatedMudanca) => {
                if (isSupa && id) {
                  setLocalMudancas(prev => {
                    const next = prev.map(m => m.id === updatedMudanca.id ? updatedMudanca : m);
                    lsSaveMudancas(id, next);
                    return next;
                  });
                  propostasRepository.atualizarMudancaEtapa(updatedMudanca.id, {
                    observacao: updatedMudanca.observacao || null,
                    arquivo: updatedMudanca.arquivo || null,
                  }).catch(() => {});
                }
              }}
              onDeleteMudanca={(mudancaId) => {
                if (isSupa && id) {
                  const mudancaParaDeletar = mudancasEtapa.find(m => m.id === mudancaId);
                  const ehAUltima = mudancasEtapa[0]?.id === mudancaId;

                  setLocalMudancas(prev => {
                    const next = prev.filter(m => m.id !== mudancaId);
                    lsSaveMudancas(id, next);
                    return next;
                  });

                  if (ehAUltima && mudancaParaDeletar) {
                    const etapaReversa = (mudancaParaDeletar.etapa_anterior || ETAPA_DEFAULT) as EtapaFunil;
                    propostasRepository.atualizar(id, { etapa_funil: etapaReversa })
                      .then(p => {
                        setPropostaSupa(p);
                        // Reverter pontos se necessário
                        const responsavel = p.responsavel_comercial || p.responsavel || 'Usuário';
                        gamificacaoService.reverterAtividadePorEtapa(responsavel, mudancaParaDeletar.etapa_nova as any);
                      })
                      .catch(console.error);
                  }
                  
                  propostasRepository.deletarMudancaEtapa(mudancaId).catch(() => {});
                }
              }}
              onAprovarMudanca={(mudancaId) => {
                if (isSupa && id) {
                  setLocalMudancas(prev => {
                    const next = prev.map(m => m.id === mudancaId ? { ...m, status: 'aprovado' as const } : m);
                    lsSaveMudancas(id, next);
                    return next;
                  });
                  propostasRepository.atualizarMudancaEtapa(mudancaId, { status: 'aprovado' }).catch(() => {});
                }
              }}
            />
            {orc && (
              <div className="mt-8">
                <MapaJornadaComercial 
                  etapaAtual={orc.etapaFunil} 
                  resultadoComercial={orc.resultadoComercial} 
                  performer={usuario?.nome || orc.responsavel}
                />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <BlocoPendencias
              pendencias={pendencias}
              onResolver={(pendenciaId) => { void handleResolverPendencia(pendenciaId); }}
              onAdicionarNova={() => setModalPendenciaAberto(true)}
            />
            <BlocoComercial
              orc={orc}
              onMudarEtapa={handleMudarEtapa}
              onAtualizarValor={handleAtualizarValor}
              onFechamento={handleFechamento}
              mudancasEtapa={mudancasEtapa}
              papelUsuario={usuario?.papel}
            />
            <BlocoQualificacao orc={orc} onAtualizar={handleQualificacao} />
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Identificação</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building size={14} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Cliente</p>
                    <p className="text-sm font-medium text-slate-700">{orc.clienteNome}</p>
                  </div>
                </div>
                {orc.linkArquivo && (
                  <div className="flex items-start gap-3">
                    <FolderOpen size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400">Link do Arquivo</p>
                      <p className="text-xs font-mono text-slate-600 truncate">{orc.linkArquivo}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {id && (
        <ModalNovoFollowUp
          aberto={modalFollowUpAberto}
          onFechar={() => setModalFollowUpAberto(false)}
          orcamentoId={id}
          onRegistrado={isSupa ? (fu) => {
            setLocalFollowUps((prev) => {
              const next = [fu, ...prev];
              lsSaveFollowUps(id, next);
              return next;
            });
            propostasRepository.inserirFollowUp({
              proposta_id: id, tipo: fu.tipo, data: fu.data, responsavel: fu.responsavel,
              resumo: fu.resumo, proxima_acao: fu.proximaAcao ?? null,
              data_proxima_acao: fu.dataProximaAcao ?? null, arquivo: fu.arquivo ?? null,
            }).catch(() => {});
            const updateData = fu.proximaAcao
              ? { proxima_acao: fu.proximaAcao, data_proxima_acao: fu.dataProximaAcao ?? null, ultima_interacao: fu.data.slice(0, 10) }
              : { ultima_interacao: fu.data.slice(0, 10) };
            const executor = usuario?.nome || orc?.responsavel || fu.responsavel;
            if (executor) gamificacaoService.registrarAtividadeDireta(executor, 'followup_realizado').catch(console.error);
            propostasRepository.atualizar(id, updateData).then((p) => setPropostaSupa(p)).catch(() => {});
          } : undefined}
        />
      )}

      {id && (
        <ModalNovaPendencia
          aberto={modalPendenciaAberto}
          onFechar={() => setModalPendenciaAberto(false)}
          orcamentoId={id}
          onRegistrada={isSupa ? async (pend) => {
            const salvo = await propostasRepository.inserirPendencia({
              orcamentoId: id, descricao: pend.descricao, status: pend.status,
              responsavel: pend.responsavel, prazo: pend.prazo,
            });
            if (salvo) setLocalPendencias((prev) => [salvo, ...prev]);
          } : undefined}
        />
      )}
    </div>
  );
}
