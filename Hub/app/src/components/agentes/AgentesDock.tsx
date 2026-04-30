import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCheck,
  ClipboardList,
  Database,
  ListChecks,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type {
  ItemFilaAgente,
  PainelOperacaoAgente,
  PrioridadeFila,
  StatusFila,
} from '../../domain/entities/AgenteOperacao';
import { agenteOperacaoService } from '../../infrastructure/services/agenteOperacaoService';

interface AgentesDockProps {
  embutido?: boolean;
}

function formatarData(value: string | null | undefined) {
  if (!value) return 'Sem registro';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function badgeStatusFila(status: StatusFila) {
  if (status === 'concluido') return 'bg-emerald-500/15 border-emerald-400/35 text-emerald-100';
  if (status === 'erro') return 'bg-rose-500/15 border-rose-400/35 text-rose-100';
  if (status === 'processando') return 'bg-amber-500/15 border-amber-400/35 text-amber-100';
  if (status === 'aguardando_aprovacao') return 'bg-sky-500/15 border-sky-400/35 text-sky-100';
  if (status === 'cancelado') return 'bg-slate-500/25 border-slate-300/30 text-slate-200';
  return 'bg-indigo-500/15 border-indigo-400/35 text-indigo-100';
}

function badgePrioridade(prioridade: PrioridadeFila) {
  if (prioridade === 'critica') return 'text-rose-300';
  if (prioridade === 'alta') return 'text-amber-200';
  if (prioridade === 'baixa') return 'text-emerald-300';
  return 'text-sky-200';
}

function statusLabel(status: StatusFila) {
  if (status === 'aguardando_aprovacao') return 'Aguardando aprovacao';
  if (status === 'processando') return 'Processando';
  if (status === 'concluido') return 'Concluido';
  if (status === 'cancelado') return 'Cancelado';
  if (status === 'erro') return 'Erro';
  return 'Novo';
}

const EMPTY_PAINEL: PainelOperacaoAgente = {
  fonte: 'supabase',
  fluxos: [],
  fila: [],
  execucoes: [],
  acoes: [],
  metricas: {
    fluxosAtivos: 0,
    itensPendentes: 0,
    itensProcessando: 0,
    itensComErro: 0,
    itensConcluidos24h: 0,
  },
};

export function AgentesDock({ embutido = false }: AgentesDockProps) {
  const { usuario } = useAuth();
  const [aberto, setAberto] = useState(embutido);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [painel, setPainel] = useState<PainelOperacaoAgente>(EMPTY_PAINEL);

  const [fluxoSelecionadoId, setFluxoSelecionadoId] = useState<string | null>(null);
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [observacaoAcao, setObservacaoAcao] = useState('');

  const [novoFluxoId, setNovoFluxoId] = useState('');
  const [novoTipo, setNovoTipo] = useState('resposta_usuario');
  const [novoEntidadeId, setNovoEntidadeId] = useState('');
  const [novoPayload, setNovoPayload] = useState('{}');
  const [novoPrioridade, setNovoPrioridade] = useState<PrioridadeFila>('media');
  const [enviandoNovoItem, setEnviandoNovoItem] = useState(false);

  async function carregarPainel(silencioso = false) {
    try {
      if (!silencioso) setLoading(true);
      const data = await agenteOperacaoService.carregarPainel();
      setPainel(data);
      setErro(null);
    } catch (error: any) {
      setPainel(EMPTY_PAINEL);
      setErro(String(error?.message || error));
    } finally {
      if (!silencioso) setLoading(false);
    }
  }

  useEffect(() => {
    carregarPainel();
    const unsubscribeRealtime = agenteOperacaoService.assinarAtualizacoes(() => {
      carregarPainel(true);
    });
    const interval = setInterval(() => carregarPainel(true), 30000);
    return () => {
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    carregarPainel(true);
  }, [aberto]);

  useEffect(() => {
    if (embutido) setAberto(true);
  }, [embutido]);

  useEffect(() => {
    if (!painel.fluxos.length) {
      setFluxoSelecionadoId(null);
      setNovoFluxoId('');
      return;
    }

    if (!novoFluxoId) {
      setNovoFluxoId(painel.fluxos[0].id);
    }

    const existeFluxoSelecionado = painel.fluxos.some((fluxo) => fluxo.id === fluxoSelecionadoId);
    if (!fluxoSelecionadoId || !existeFluxoSelecionado) {
      setFluxoSelecionadoId(painel.fluxos[0].id);
    }
  }, [painel.fluxos, fluxoSelecionadoId, novoFluxoId]);

  const fluxoSelecionado = painel.fluxos.find((item) => item.id === fluxoSelecionadoId) || null;

  const filaFiltrada = useMemo(() => {
    if (!fluxoSelecionadoId) return painel.fila;
    return painel.fila.filter((item) => item.fluxoId === fluxoSelecionadoId);
  }, [painel.fila, fluxoSelecionadoId]);

  useEffect(() => {
    if (!filaFiltrada.length) {
      setItemSelecionadoId(null);
      return;
    }
    const existe = filaFiltrada.some((item) => item.id === itemSelecionadoId);
    if (!itemSelecionadoId || !existe) {
      setItemSelecionadoId(filaFiltrada[0].id);
    }
  }, [filaFiltrada, itemSelecionadoId]);

  const itemSelecionado =
    filaFiltrada.find((item) => item.id === itemSelecionadoId) || filaFiltrada[0] || null;

  const acoesDoItem = useMemo(() => {
    if (!itemSelecionado) return [];
    return painel.acoes.filter((acao) => acao.filaId === itemSelecionado.id);
  }, [painel.acoes, itemSelecionado]);

  const execucoesDoItem = useMemo(() => {
    if (!itemSelecionado) return [];
    return painel.execucoes.filter((item) => item.filaId === itemSelecionado.id);
  }, [painel.execucoes, itemSelecionado]);

  async function handleCriarNovoItem() {
    if (!usuario) return;
    setEnviandoNovoItem(true);
    setInfo(null);

    try {
      const payload = JSON.parse(novoPayload || '{}');
      const result = await agenteOperacaoService.criarItem({
        fluxoId: novoFluxoId,
        entidadeTipo: novoTipo,
        entidadeId: novoEntidadeId,
        origem: 'app',
        prioridade: novoPrioridade,
        payload,
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
      });

      if (!result.sucesso) {
        setErro(result.erro || 'Nao foi possivel criar item na fila.');
        return;
      }

      setErro(null);
      setInfo('Evento salvo no Supabase. O agente via MCP ja pode processar.');
      setNovoEntidadeId('');
      setNovoPayload('{}');
      await carregarPainel(true);
    } catch {
      setErro('Payload JSON invalido. Ajuste o campo payload e tente novamente.');
    } finally {
      setEnviandoNovoItem(false);
    }
  }

  async function handleAtualizarStatus(status: StatusFila, acao: string) {
    if (!usuario || !itemSelecionado) return;

    setSalvandoStatus(true);
    setInfo(null);

    const result = await agenteOperacaoService.atualizarStatus({
      itemId: itemSelecionado.id,
      status,
      observacao: observacaoAcao,
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      acao,
      resultado: status === 'concluido' ? { origem: 'app', finalizado_por: usuario.nome } : undefined,
    });

    setSalvandoStatus(false);

    if (!result.sucesso) {
      setErro(result.erro || 'Nao foi possivel atualizar o item.');
      return;
    }

    setErro(null);
    setInfo(`Item atualizado para "${statusLabel(status)}".`);
    setObservacaoAcao('');
    await carregarPainel(true);
  }

  const metricas = painel.metricas;

  if (!usuario) return null;

  return (
    <>
      {!embutido && (
        <motion.button
          type="button"
          onClick={() => setAberto(true)}
          whileHover={{ x: -6 }}
          whileTap={{ scale: 0.98 }}
          className="fixed right-0 top-1/2 z-[60] hidden -translate-y-1/2 rounded-l-[24px] border border-[#5C73A8]/60 bg-[#11214B]/95 px-4 py-5 text-left text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:flex"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FFD76E]/30 bg-[#FFC82D]/15 text-[#FFD76E]">
              <Bot size={20} />
            </div>
            <div className="pr-1">
              <p className="text-[9px] uppercase tracking-[0.35em] text-[#FFD76E]">Agente</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                Operacao
              </p>
            </div>
          </div>
        </motion.button>
      )}

      <AnimatePresence>
        {aberto && (
          <div className={embutido ? 'h-full' : 'fixed inset-0 z-[90]'}>
            {!embutido && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAberto(false)}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
              />
            )}

            <motion.aside
              initial={embutido ? { opacity: 1, x: 0 } : { x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={embutido ? { opacity: 1, x: 0 } : { x: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={
                embutido
                  ? 'h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#08142F]/96 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-3xl'
                  : 'absolute right-0 top-0 h-full w-full max-w-[1280px] overflow-hidden border-l border-white/10 bg-[#08142F]/96 shadow-[0_20px_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl'
              }
            >
              <div className="flex h-full flex-col">
                <header className="border-b border-white/10 bg-[#0B1738]/90 px-5 py-5 lg:px-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 text-[#FFD76E]">
                        <Sparkles size={18} />
                        <span className="text-[10px] font-black uppercase tracking-[0.38em]">
                          Operacao de Agente
                        </span>
                      </div>
                      <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.12em] text-white">
                        App, Supabase e MCP no mesmo estado
                      </h2>
                      <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-[#C9D9FF]">
                        Arquitetura real: o app registra eventos no Supabase, o agente via MCP le a fila,
                        decide e grava retorno no banco. Esta tela mostra fluxos, fila, execucoes e acoes
                        vindo do proprio Supabase.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => carregarPainel()}
                        className="flex items-center gap-2 rounded-2xl border border-[#5C73A8]/60 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#DCE8FF] transition hover:border-[#FFD76E] hover:text-[#FFD76E]"
                      >
                        <RefreshCw size={15} />
                        Atualizar
                      </button>
                      {!embutido && (
                        <button
                          type="button"
                          onClick={() => setAberto(false)}
                          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-rose-400/50 hover:text-rose-300"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-[20px] border border-[#3D5EA8]/60 bg-[#12285A]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[#FFD76E]">Fonte</p>
                      <p className="mt-3 text-lg font-black text-white">SUPABASE</p>
                    </div>
                    <div className="rounded-[20px] border border-[#3D5EA8]/60 bg-[#12285A]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[#57E6A8]">Fluxos ativos</p>
                      <p className="mt-3 text-3xl font-black text-white">{metricas.fluxosAtivos}</p>
                    </div>
                    <div className="rounded-[20px] border border-[#3D5EA8]/60 bg-[#12285A]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[#A4C0FF]">Pendentes</p>
                      <p className="mt-3 text-3xl font-black text-white">{metricas.itensPendentes}</p>
                    </div>
                    <div className="rounded-[20px] border border-[#3D5EA8]/60 bg-[#12285A]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[#FFD76E]">Processando</p>
                      <p className="mt-3 text-3xl font-black text-white">{metricas.itensProcessando}</p>
                    </div>
                    <div className="rounded-[20px] border border-[#3D5EA8]/60 bg-[#12285A]/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[#FF9FB3]">Com erro</p>
                      <p className="mt-3 text-3xl font-black text-white">{metricas.itensComErro}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-[#5C73A8]/45 bg-[#10224D]/65 px-4 py-4">
                    <div className="flex items-center gap-2 text-[#FFD76E]">
                      <Database size={16} />
                      <p className="text-[10px] font-black uppercase tracking-[0.28em]">
                        Registrar evento do app no Supabase
                      </p>
                    </div>
                    <p className="mt-2 text-[12px] font-semibold text-[#C9D9FF]">
                      Use este bloco para enviar um evento real para a fila. O agente via MCP processa e
                      grava o retorno no mesmo banco.
                    </p>

                    <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_180px]">
                      <select
                        value={novoFluxoId}
                        onChange={(event) => setNovoFluxoId(event.target.value)}
                        className="h-11 rounded-2xl border border-[#5C73A8]/55 bg-[#091833] px-3 text-[12px] font-semibold text-white outline-none transition focus:border-[#FFD76E]/50"
                      >
                        {painel.fluxos.map((fluxo) => (
                          <option key={fluxo.id} value={fluxo.id}>
                            {fluxo.nome}
                          </option>
                        ))}
                      </select>
                      <input
                        value={novoTipo}
                        onChange={(event) => setNovoTipo(event.target.value)}
                        className="h-11 rounded-2xl border border-[#5C73A8]/55 bg-[#091833] px-3 text-[12px] font-semibold text-white outline-none transition placeholder:text-[#7F97CD] focus:border-[#FFD76E]/50"
                        placeholder="tipo da entidade"
                      />
                      <input
                        value={novoEntidadeId}
                        onChange={(event) => setNovoEntidadeId(event.target.value)}
                        className="h-11 rounded-2xl border border-[#5C73A8]/55 bg-[#091833] px-3 text-[12px] font-semibold text-white outline-none transition placeholder:text-[#7F97CD] focus:border-[#FFD76E]/50"
                        placeholder="id da entidade"
                      />
                      <select
                        value={novoPrioridade}
                        onChange={(event) => setNovoPrioridade(event.target.value as PrioridadeFila)}
                        className="h-11 rounded-2xl border border-[#5C73A8]/55 bg-[#091833] px-3 text-[12px] font-semibold text-white outline-none transition focus:border-[#FFD76E]/50"
                      >
                        <option value="baixa">Prioridade baixa</option>
                        <option value="media">Prioridade media</option>
                        <option value="alta">Prioridade alta</option>
                        <option value="critica">Prioridade critica</option>
                      </select>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_auto]">
                      <textarea
                        rows={3}
                        value={novoPayload}
                        onChange={(event) => setNovoPayload(event.target.value)}
                        className="w-full rounded-[18px] border border-[#5C73A8]/55 bg-[#091833] px-3 py-3 text-[12px] font-semibold text-white outline-none transition placeholder:text-[#7F97CD] focus:border-[#FFD76E]/50"
                        placeholder='payload JSON ex: {"mensagem":"usuario respondeu"}'
                      />
                      <button
                        type="button"
                        onClick={handleCriarNovoItem}
                        disabled={enviandoNovoItem || !novoFluxoId}
                        className="h-11 self-end rounded-2xl border border-[#57E6A8]/40 bg-[#57E6A8]/15 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#57E6A8] transition hover:bg-[#57E6A8]/25 disabled:opacity-60"
                      >
                        {enviandoNovoItem ? 'Enviando...' : 'Enviar para fila'}
                      </button>
                    </div>
                  </div>

                  {info && (
                    <div className="mt-4 rounded-[22px] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-[12px] font-semibold text-emerald-100">
                      {info}
                    </div>
                  )}

                  {erro && (
                    <div className="mt-4 rounded-[22px] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-[12px] font-semibold text-rose-100">
                      {erro}
                    </div>
                  )}
                </header>

                <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(240px,320px)_minmax(320px,420px)_minmax(0,1fr)]">
                  <section className="min-h-0 min-w-0 border-b border-white/10 bg-[#091833]/75 xl:border-b-0 xl:border-r flex flex-col">
                    <div className="border-b border-white/10 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD76E]">
                        Fluxos observados
                      </p>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                      {painel.fluxos.map((fluxo) => {
                        const ativo = fluxoSelecionadoId === fluxo.id;
                        return (
                          <button
                            key={fluxo.id}
                            type="button"
                            onClick={() => setFluxoSelecionadoId(fluxo.id)}
                            className={`mb-3 w-full rounded-[20px] border px-4 py-4 text-left transition ${
                              ativo
                                ? 'border-[#FFD76E]/50 bg-[#FFC82D]/12'
                                : 'border-white/10 bg-white/5 hover:border-[#5C73A8]/60'
                            }`}
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FFD76E]">
                              {fluxo.codigo}
                            </p>
                            <p className="mt-2 text-[15px] font-black uppercase tracking-[0.08em] text-white">
                              {fluxo.nome}
                            </p>
                            <p className="mt-2 text-[12px] font-semibold text-[#C6D7FF]">{fluxo.descricao}</p>
                            <div className="mt-3 space-y-1 text-[11px] font-semibold text-[#AFC6FF]">
                              <div>Origem: {fluxo.tabelaOrigem}</div>
                              <div>Destino: {fluxo.tabelaDestino}</div>
                              <div>Pendencias: {fluxo.pendencias}</div>
                              <div>Ultimo processamento: {formatarData(fluxo.ultimoProcessamentoEm)}</div>
                            </div>
                            <div className="mt-3">
                              <span
                                className={`rounded-xl border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                  fluxo.ativo
                                    ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
                                    : 'border-slate-400/35 bg-slate-600/20 text-slate-200'
                                }`}
                              >
                                {fluxo.ativo ? 'Ativo' : 'Pausado'}
                              </span>
                            </div>
                          </button>
                        );
                      })}

                      {!painel.fluxos.length && !loading && (
                        <div className="rounded-[20px] border border-dashed border-white/15 bg-white/5 p-4 text-[12px] font-semibold text-[#C6D7FF]">
                          Nenhum fluxo cadastrado no Supabase.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="min-h-0 min-w-0 border-b border-white/10 bg-[#0B1B3B]/70 xl:border-b-0 xl:border-r flex flex-col">
                    <div className="border-b border-white/10 px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#57E6A8]">
                          Fila do fluxo
                        </p>
                        <span className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-white">
                          {filaFiltrada.length} itens
                        </span>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                      {filaFiltrada.map((item) => {
                        const ativo = itemSelecionadoId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setItemSelecionadoId(item.id)}
                            className={`mb-3 w-full rounded-[20px] border px-4 py-4 text-left transition ${
                              ativo
                                ? 'border-[#57E6A8]/45 bg-[#57E6A8]/10'
                                : 'border-white/10 bg-white/5 hover:border-[#5C73A8]/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD76E]">
                                  {item.fluxoNome}
                                </p>
                                <p className="mt-1 truncate text-[13px] font-black uppercase tracking-[0.08em] text-white">
                                  {item.entidadeTipo}
                                </p>
                                <p className="truncate text-[12px] font-semibold text-[#C6D7FF]">
                                  ID: {item.entidadeId}
                                </p>
                              </div>
                              <span
                                className={`rounded-xl border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${badgeStatusFila(item.status)}`}
                              >
                                {statusLabel(item.status)}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold">
                              <span className={badgePrioridade(item.prioridade)}>
                                Prioridade: {item.prioridade}
                              </span>
                              <span className="text-[#AFC6FF]">{formatarData(item.atualizadoEm)}</span>
                            </div>
                            {item.erro && (
                              <p className="mt-2 line-clamp-2 text-[11px] font-semibold text-rose-200">
                                Erro: {item.erro}
                              </p>
                            )}
                          </button>
                        );
                      })}

                      {!filaFiltrada.length && !loading && (
                        <div className="rounded-[20px] border border-dashed border-white/15 bg-white/5 p-4 text-[12px] font-semibold text-[#C6D7FF]">
                          Nao ha itens de fila para este fluxo.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="min-h-0 min-w-0 bg-[#08142F] flex flex-col">
                    <div className="border-b border-white/10 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFB9C7]">
                        Detalhes e rastreio
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#C6D7FF]">
                        Status real do item selecionado, com acoes do usuario e execucoes do agente.
                      </p>
                    </div>

                    <div className="min-h-0 min-w-0 overflow-y-auto px-5 py-5">
                      {loading && (
                        <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 text-[13px] font-semibold text-[#C6D7FF]">
                          Carregando dados do Supabase...
                        </div>
                      )}

                      {!loading && !itemSelecionado && (
                        <div className="rounded-[20px] border border-dashed border-white/15 bg-white/5 p-5 text-[13px] font-semibold text-[#C6D7FF]">
                          Selecione um item da fila para ver detalhes.
                        </div>
                      )}

                      {!loading && itemSelecionado && (
                        <div className="space-y-4">
                          <ItemResumoCard item={itemSelecionado} fluxoSelecionado={fluxoSelecionado} />

                          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center gap-2 text-[#FFD76E]">
                              <ListChecks size={16} />
                              <p className="text-[10px] font-black uppercase tracking-[0.24em]">
                                Acao do operador
                              </p>
                            </div>
                            <textarea
                              rows={3}
                              value={observacaoAcao}
                              onChange={(event) => setObservacaoAcao(event.target.value)}
                              className="mt-3 w-full rounded-[16px] border border-white/10 bg-[#091833] px-3 py-2 text-[12px] font-semibold text-white outline-none transition placeholder:text-[#7F97CD] focus:border-[#FFD76E]/50"
                              placeholder="Observacao para trilha de auditoria do Supabase..."
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={salvandoStatus}
                                onClick={() => handleAtualizarStatus('processando', 'marcar_processando')}
                                className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100 disabled:opacity-60"
                              >
                                <Play size={12} className="mr-1 inline-block" />
                                Processando
                              </button>
                              <button
                                type="button"
                                disabled={salvandoStatus}
                                onClick={() =>
                                  handleAtualizarStatus('aguardando_aprovacao', 'enviar_aprovacao')
                                }
                                className="rounded-xl border border-sky-400/35 bg-sky-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-sky-100 disabled:opacity-60"
                              >
                                <Send size={12} className="mr-1 inline-block" />
                                Aprovacao
                              </button>
                              <button
                                type="button"
                                disabled={salvandoStatus}
                                onClick={() => handleAtualizarStatus('concluido', 'marcar_concluido')}
                                className="rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100 disabled:opacity-60"
                              >
                                <CheckCheck size={12} className="mr-1 inline-block" />
                                Concluir
                              </button>
                              <button
                                type="button"
                                disabled={salvandoStatus}
                                onClick={() => handleAtualizarStatus('erro', 'marcar_erro')}
                                className="rounded-xl border border-rose-400/35 bg-rose-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-rose-100 disabled:opacity-60"
                              >
                                <AlertTriangle size={12} className="mr-1 inline-block" />
                                Marcar erro
                              </button>
                              <button
                                type="button"
                                disabled={salvandoStatus}
                                onClick={() => handleAtualizarStatus('cancelado', 'cancelar_item')}
                                className="rounded-xl border border-slate-400/35 bg-slate-500/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-100 disabled:opacity-60"
                              >
                                <XCircle size={12} className="mr-1 inline-block" />
                                Cancelar
                              </button>
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center gap-2 text-[#57E6A8]">
                              <Activity size={16} />
                              <p className="text-[10px] font-black uppercase tracking-[0.24em]">
                                Execucoes do agente (MCP)
                              </p>
                            </div>
                            <div className="mt-3 space-y-2">
                              {execucoesDoItem.length === 0 && (
                                <p className="text-[12px] font-semibold text-[#AFC6FF]">
                                  Sem execucoes registradas ainda para este item.
                                </p>
                              )}
                              {execucoesDoItem.map((run) => (
                                <div
                                  key={run.id}
                                  className="rounded-[14px] border border-white/10 bg-[#0E214B]/70 p-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[12px] font-black uppercase tracking-[0.08em] text-white">
                                      {run.agenteNome}
                                    </p>
                                    <span
                                      className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${
                                        run.status === 'concluido'
                                          ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
                                          : run.status === 'erro'
                                          ? 'border-rose-400/35 bg-rose-500/15 text-rose-100'
                                          : 'border-amber-400/35 bg-amber-500/15 text-amber-100'
                                      }`}
                                    >
                                      {run.status}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] font-semibold text-[#AFC6FF]">
                                    Origem: {run.origemExecutor} | Inicio: {formatarData(run.iniciadoEm)}
                                  </p>
                                  {run.erro && (
                                    <p className="mt-1 text-[11px] font-semibold text-rose-200">
                                      Erro: {run.erro}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center gap-2 text-[#A4C0FF]">
                              <ClipboardList size={16} />
                              <p className="text-[10px] font-black uppercase tracking-[0.24em]">
                                Acoes registradas
                              </p>
                            </div>
                            <div className="mt-3 space-y-2">
                              {acoesDoItem.length === 0 && (
                                <p className="text-[12px] font-semibold text-[#AFC6FF]">
                                  Sem acoes registradas.
                                </p>
                              )}
                              {acoesDoItem.map((acao) => (
                                <div key={acao.id} className="rounded-[14px] border border-white/10 bg-[#0E214B]/70 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[12px] font-black uppercase tracking-[0.08em] text-white">
                                      {acao.acao}
                                    </p>
                                    <span className="text-[11px] font-semibold text-[#AFC6FF]">
                                      {formatarData(acao.criadoEm)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] font-semibold text-[#C6D7FF]">
                                    {acao.atorTipo} - {acao.atorNome}
                                  </p>
                                  <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-[10px] border border-white/10 bg-[#091833] p-2 text-[11px] font-semibold text-[#DCE8FF]">
                                    {JSON.stringify(acao.detalhes || {}, null, 2)}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <footer className="border-t border-white/10 bg-[#0B1738]/90 px-5 py-4 text-[11px] font-semibold text-[#9FB8F6] lg:px-8">
                  Fluxo oficial: app grava no Supabase, agente processa via MCP, agente grava resultado no
                  Supabase, e o app atualiza automaticamente por realtime.
                </footer>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function ItemResumoCard({
  item,
  fluxoSelecionado,
}: {
  item: ItemFilaAgente;
  fluxoSelecionado: PainelOperacaoAgente['fluxos'][number] | null;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD76E]">{item.fluxoNome}</p>
          <h3 className="mt-2 text-lg font-black uppercase tracking-[0.08em] text-white">
            {item.entidadeTipo} / {item.entidadeId}
          </h3>
          <p className="mt-1 text-[12px] font-semibold text-[#C6D7FF]">
            Criado por {item.criadoPorNome} em {formatarData(item.criadoEm)}
          </p>
        </div>
        <span
          className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${badgeStatusFila(item.status)}`}
        >
          {statusLabel(item.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[14px] border border-white/10 bg-[#10224D]/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9FB8F6]">Fluxo</p>
          <p className="mt-1 text-[12px] font-black text-white">{fluxoSelecionado?.codigo || 'N/A'}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-[#10224D]/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9FB8F6]">Prioridade</p>
          <p className={`mt-1 text-[12px] font-black uppercase ${badgePrioridade(item.prioridade)}`}>
            {item.prioridade}
          </p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-[#10224D]/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9FB8F6]">Reservado por</p>
          <p className="mt-1 text-[12px] font-black text-white">{item.reservadoPor || 'Nao reservado'}</p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-[#10224D]/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9FB8F6]">Tentativas</p>
          <p className="mt-1 text-[12px] font-black text-white">{item.tentativas}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-[14px] border border-white/10 bg-[#091833] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9FB8F6]">Payload</p>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-[11px] font-semibold text-[#DCE8FF]">
            {JSON.stringify(item.payload || {}, null, 2)}
          </pre>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-[#091833] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9FB8F6]">Resultado</p>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-[11px] font-semibold text-[#DCE8FF]">
            {JSON.stringify(item.resultado || {}, null, 2)}
          </pre>
        </div>
      </div>

      {item.erro && (
        <p className="mt-3 rounded-[12px] border border-rose-400/35 bg-rose-500/15 px-3 py-2 text-[12px] font-semibold text-rose-100">
          Erro atual: {item.erro}
        </p>
      )}
    </div>
  );
}
