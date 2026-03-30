import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Building, Tag, Clock, CheckCircle, XCircle, FolderOpen, Edit2, Save, X, Copy } from 'lucide-react';
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

import { propostasRepository, type PropostaSupabase, type MudancaEtapaRow, type FollowUpRow } from '../infrastructure/supabase/propostasRepository';
import type { FollowUp } from '../domain/entities/FollowUp';
import type { MudancaEtapa } from '../domain/entities/MudancaEtapa';
import type { DadosFechamento } from '../components/orcamentos/ModalFechamentoComercial';
import type { AtualizarQualificacaoInput } from '../context/NovoOrcamentoContext';
import type { OrcamentoCard } from '../context/NovoOrcamentoContext';
import { calcularPrioridade, PRIORIDADE_CONFIG, calcularScoreABC, PRIORIDADE_ABC_CONFIG } from '../utils/prioridade';
import type { StatusRevisao } from '../domain/value-objects/StatusRevisao';
import type { EtapaFunil } from '../domain/value-objects/EtapaFunil';
import { ETAPA_CORES } from '../domain/value-objects/EtapaFunil';
import type { ResultadoComercial } from '../domain/value-objects/ResultadoComercial';
import { RESULTADO_CORES } from '../domain/value-objects/ResultadoComercial';

const ETAPA_DEFAULT: EtapaFunil = 'entrada_oportunidade';
const RESULTADO_DEFAULT: ResultadoComercial = 'em_andamento';

/* === localStorage helpers para persistência quando tabelas Supabase não existem === */
function lsKey(propostaId: string, tipo: 'mudancas' | 'followups') {
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
    data: r.created_at,
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
  const [editandoLink, setEditandoLink] = useState(false);
  const [linkInput, setLinkInput] = useState('');

  // Tentar do mock primeiro
  const orcMock = id ? buscarOrcamento(id) : null;

  // Se não achou no mock, buscar do Supabase
  const [propostaSupa, setPropostaSupa] = useState<PropostaSupabase | null>(null);
  const [carregando, setCarregando] = useState(!orcMock && !!id);

  useEffect(() => {
    if (orcMock || !id) return;
    let cancelado = false;
    setCarregando(true);
    Promise.all([
      propostasRepository.buscarPorId(id),
      propostasRepository.listarMudancasEtapa(id),
      propostasRepository.listarFollowUps(id),
    ]).then(([p, mudancas, fups]) => {
      if (!cancelado) {
        setPropostaSupa(p);
        // Se Supabase retornou dados do histórico, usar; senão fallback localStorage
        const m = mudancas.length > 0 ? mudancas.map(rowParaMudanca) : lsGetMudancas(id);
        const f = fups.length > 0 ? fups.map(rowParaFollowUp) : lsGetFollowUps(id);
        setLocalMudancas(m);
        setLocalFollowUps(f);
        setCarregando(false);
      }
    }).catch(() => {
      if (!cancelado) {
        // Fallback total: carregar do localStorage
        setLocalMudancas(lsGetMudancas(id));
        setLocalFollowUps(lsGetFollowUps(id));
        setCarregando(false);
      }
    });
    return () => { cancelado = true; };
  }, [id, orcMock]);

  const orc: OrcamentoCard | null = orcMock ?? (propostaSupa ? propostaParaOrc(propostaSupa) : null);
  const isSupa = !orcMock && !!propostaSupa;

  // Estado local para Supabase (sem tabelas de histórico no banco)
  const [localFollowUps, setLocalFollowUps] = useState<FollowUp[]>([]);
  const [localMudancas, setLocalMudancas] = useState<MudancaEtapa[]>([]);

  const followUps = isSupa ? localFollowUps : (id ? buscarFollowUps(id) : []);
  const pendencias = id && !isSupa ? buscarPendencias(id) : [];
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
          <button
            onClick={() => navigate('/orcamentos')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">Orçamento não encontrado.</p>
        </div>
      </div>
    );
  }

  function handleMudarEtapa(etapaNova: EtapaFunil, observacao?: string) {
    if (!id) return;
    if (isSupa) {
      const etapaAnterior = orc?.etapaFunil ?? null;
      const resp = usuario?.nome ?? 'Usuário';
      propostasRepository.atualizar(id, { etapa_funil: etapaNova }).then((p) => {
        setPropostaSupa(p);
      }).catch(() => {});
      // Criar registro local imediatamente (localStorage + state)
      const novaMudanca: MudancaEtapa = {
        id: crypto.randomUUID(),
        orcamentoId: id,
        etapaAnterior: etapaAnterior as EtapaFunil | null,
        etapaNova,
        responsavel: resp,
        observacao,
        data: new Date().toISOString(),
      };
      setLocalMudancas((prev) => {
        const next = [novaMudanca, ...prev];
        lsSaveMudancas(id, next);
        return next;
      });
      // Tentar salvar no Supabase também (best-effort)
      propostasRepository.inserirMudancaEtapa({
        proposta_id: id,
        etapa_anterior: etapaAnterior,
        etapa_nova: etapaNova,
        responsavel: resp,
        observacao: observacao ?? null,
      }).catch(() => {});
    } else {
      atualizarEtapaFunil(id, etapaNova, usuario?.nome ?? 'Paulo Confar', observacao);
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
      }).then((p) => { setPropostaSupa(p); }).catch(() => {});
    } else {
      atualizarQualificacao(id, dados);
    }
  }

  function handleSalvarLink() {
    if (!id) return;
    if (isSupa) {
      // Supabase propostas não tem linkArquivo — apenas fechar edição
      setEditandoLink(false);
    } else {
      atualizarComercial(id, { linkArquivo: linkInput.trim() });
      setEditandoLink(false);
    }
  }

  function handleFechamento(dados: DadosFechamento) {
    if (!id) return;
    if (isSupa) {
      const update = dados.resultado === 'ganho'
        ? { resultado_comercial: 'ganho', etapa_funil: 'pos_venda', valor_orcado: dados.valorFechado }
        : { resultado_comercial: 'perdido' };
      propostasRepository.atualizar(id, update).then((p) => { setPropostaSupa(p); }).catch(() => {});
    } else {
      if (dados.resultado === 'ganho') {
        atualizarComercial(id, {
          resultadoComercial: 'ganho',
          etapaFunil: 'pos_venda',
          dataFechamento: dados.dataFechamento,
          valorProposta: dados.valorFechado,
        });
      } else {
        atualizarComercial(id, {
          resultadoComercial: 'perdido',
          dataFechamento: dados.dataFechamento,
          motivoPerda: dados.motivoPerda,
        });
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="px-8 py-4 border-b border-slate-200 bg-white flex items-center gap-4">
        <button
          onClick={() => navigate('/orcamentos')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <span className="text-slate-300">|</span>
        <span className="font-mono text-sm text-slate-500 flex-shrink-0">{orc.numero}</span>
        <StatusBadgeNovo
          status={orc.status as StatusRevisao | 'rascunho'}
          label={orc.statusLabel}
        />
        <h1 className="text-lg font-bold text-slate-800 truncate">{orc.titulo}</h1>
        {/* Badge A/B/C */}
        {(() => {
          const abc = calcularScoreABC(orc);
          if (!abc) return null;
          const cfg = PRIORIDADE_ABC_CONFIG[abc.classe];
          return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border flex-shrink-0 ${cfg.bg} ${cfg.border}`}>
              <span className={`text-base font-bold leading-none ${cfg.text}`}>{abc.classe}</span>
              <span className={`text-xs font-medium ${cfg.text}`}>{abc.score}/10</span>
            </div>
          );
        })()}
        <div className="ml-auto flex-shrink-0">
          <AlertasOrcamento orc={orc} />
        </div>
      </div>

      {/* Meta strip */}
      <div
        className={`px-8 py-3 border-b border-slate-200 ${
          orc.resultadoComercial === 'ganho'
            ? 'bg-green-50'
            : orc.resultadoComercial === 'perdido'
            ? 'bg-red-50'
            : 'bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-8 text-sm flex-wrap">
          {/* Resultado comercial — destaque quando fechado */}
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

          {/* Etapa */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Etapa</span>
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {orc.etapaAtual}
            </span>
          </div>

          {/* Responsável */}
          <div className="flex items-center gap-2">
            <User size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-600 text-xs">{orc.responsavel || '—'}</span>
          </div>

          {/* Próxima ação — oculta quando fechado */}
          {orc.resultadoComercial === 'em_andamento' && (
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 text-xs max-w-[240px] truncate">
                {orc.proximaAcao || 'Nenhuma ação pendente'}
              </span>
            </div>
          )}

          {/* Data da próxima ação */}
          {orc.dataProximaAcao && orc.resultadoComercial === 'em_andamento' && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 text-xs">
                {new Date(orc.dataProximaAcao + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          {/* Data de fechamento — quando fechado */}
          {orc.dataFechamento && orc.resultadoComercial !== 'em_andamento' && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 text-xs">
                Fechado em{' '}
                {new Date(orc.dataFechamento + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Banner de alertas operacionais — visível apenas quando em andamento */}
        {(() => {
          const prioridade = calcularPrioridade(orc);
          if (!prioridade || prioridade === 'baixa') return null;
          const cfg = PRIORIDADE_CONFIG[prioridade];
          return (
            <div
              className={`flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border ${cfg.bg} border-opacity-60 ${
                prioridade === 'alta' ? 'border-red-200' : 'border-amber-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className={`text-xs font-semibold ${cfg.text}`}>
                Prioridade {cfg.label}
              </span>
              <span className="text-slate-300 text-xs">•</span>
              <AlertasOrcamento orc={orc} />
            </div>
          );
        })()}

        <div className="grid grid-cols-3 gap-6">
          {/* Coluna principal — Timeline */}
          <div className="col-span-2 space-y-6">
            <TimelineFollowUp
              followUps={followUps}
              onRegistrar={() => setModalFollowUpAberto(true)}
            />

            {/* Histórico de etapas */}
            <HistoricoEtapas mudancas={mudancasEtapa} />
          </div>

          {/* Coluna lateral */}
          <div className="space-y-6">
            {/* Pendências */}
            <BlocoPendencias
              pendencias={pendencias}
              onResolver={(pendenciaId) => resolverPendencia(pendenciaId)}
            />

            {/* Bloco Comercial */}
            <BlocoComercial
              orc={orc}
              onMudarEtapa={handleMudarEtapa}
              onAtualizarValor={handleAtualizarValor}
              onFechamento={handleFechamento}
            />

            {/* Bloco Qualificação */}
            <BlocoQualificacao orc={orc} onAtualizar={handleQualificacao} />

            {/* Identificação */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Identificação
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building size={14} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Cliente</p>
                    <p className="text-sm font-medium text-slate-700">{orc.clienteNome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Tag size={14} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Tipo de Obra</p>
                    <p className="text-sm font-medium text-slate-700">
                      {orc.tiposObraNomes.length > 0 ? orc.tiposObraNomes.join(', ') : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Data-base</p>
                    <p className="text-sm font-medium text-slate-700">
                      {orc.dataBase
                        ? new Date(orc.dataBase + 'T12:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User size={14} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Responsável</p>
                    <p className="text-sm font-medium text-slate-700">{orc.responsavel || '—'}</p>
                  </div>
                </div>

                {/* Link do Arquivo */}
                <div className="flex items-start gap-3">
                  <FolderOpen size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-400">Link do Arquivo</p>
                      {!editandoLink ? (
                        <button
                          onClick={() => { setLinkInput(orc.linkArquivo ?? ''); setEditandoLink(true); }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 size={10} />
                          {orc.linkArquivo ? 'Editar' : 'Adicionar'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditandoLink(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={12} />
                          </button>
                          <button
                            onClick={handleSalvarLink}
                            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-0.5 rounded"
                          >
                            <Save size={10} />
                            Salvar
                          </button>
                        </div>
                      )}
                    </div>
                    {editandoLink ? (
                      <input
                        type="text"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="Ex: \\FILESERVER\COMERCIAL\ORC-2024-001"
                        className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSalvarLink(); if (e.key === 'Escape') setEditandoLink(false); }}
                      />
                    ) : orc.linkArquivo ? (
                      <div className="flex items-center gap-1 group">
                        <p className="text-xs font-mono text-slate-600 truncate">{orc.linkArquivo}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(orc.linkArquivo!)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 flex-shrink-0"
                          title="Copiar caminho"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 italic">Não informado</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Disciplinas */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Disciplinas
              </h3>
              {orc.disciplinaNomes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {orc.disciplinaNomes.map((nome) => (
                    <span
                      key={nome}
                      className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full"
                    >
                      {nome}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhuma disciplina informada.</p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal follow-up */}
      {id && (
        <ModalNovoFollowUp
          aberto={modalFollowUpAberto}
          onFechar={() => setModalFollowUpAberto(false)}
          orcamentoId={id}
          onRegistrado={isSupa ? (fu) => {
            // Salvar no state + localStorage imediatamente
            setLocalFollowUps((prev) => {
              const next = [fu, ...prev];
              lsSaveFollowUps(id, next);
              return next;
            });
            // Tentar salvar no Supabase (best-effort)
            propostasRepository.inserirFollowUp({
              proposta_id: id,
              tipo: fu.tipo,
              data: fu.data,
              responsavel: fu.responsavel,
              resumo: fu.resumo,
              proxima_acao: fu.proximaAcao ?? null,
              data_proxima_acao: fu.dataProximaAcao ?? null,
            }).catch(() => {});
            // Salvar próxima ação no Supabase
            const updateData = fu.proximaAcao
              ? { proxima_acao: fu.proximaAcao, data_proxima_acao: fu.dataProximaAcao ?? null, ultima_interacao: fu.data.slice(0, 10) }
              : { ultima_interacao: fu.data.slice(0, 10) };
            propostasRepository.atualizar(id, updateData).then((p) => setPropostaSupa(p)).catch(() => {});
          } : undefined}
        />
      )}
    </div>
  );
}
