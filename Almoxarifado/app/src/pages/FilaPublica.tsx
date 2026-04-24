import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Package, RefreshCw, Truck } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';

interface RequisicaoItem {
  descricao?: string;
  nome?: string;
  quantidade?: number;
  unidade?: string;
  fase_rastreio?: number | string | null;
}

interface Requisicao {
  id: string;
  criado_em: string;
  obra: string;
  status: string | null;
  itens: RequisicaoItem[] | null;
  observacao: string | null;
}

type PedidoFila = Pick<Requisicao, 'id' | 'criado_em' | 'status' | 'itens'>;
type StatusPublico = 'aguardando' | 'separando' | 'separado' | 'finalizado' | 'recebido' | 'cancelado';

const IDENT_KEY = 'biasi_public_ident_v1';

const STATUS_LABEL: Record<StatusPublico, { label: string; color: string; bg: string; border: string }> = {
  aguardando: { label: 'Aguardando', color: 'text-amber-200', bg: 'bg-amber-400/12', border: 'border-amber-300/35' },
  separando: { label: 'Separando', color: 'text-sky-200', bg: 'bg-sky-400/12', border: 'border-sky-300/35' },
  separado: { label: 'Separado', color: 'text-indigo-200', bg: 'bg-indigo-400/12', border: 'border-indigo-300/35' },
  finalizado: { label: 'Finalizado', color: 'text-purple-200', bg: 'bg-purple-400/12', border: 'border-purple-300/35' },
  recebido: { label: 'Recebido', color: 'text-emerald-200', bg: 'bg-emerald-400/12', border: 'border-emerald-300/35' },
  cancelado: { label: 'Cancelado', color: 'text-red-200', bg: 'bg-red-400/12', border: 'border-red-300/35' },
};

const ETAPAS: StatusPublico[] = ['aguardando', 'separando', 'separado', 'finalizado', 'recebido'];

function parseMaxFase(itens: RequisicaoItem[] | null): number | null {
  if (!Array.isArray(itens) || itens.length === 0) return null;

  const fases = itens
    .map((item) => Number(item?.fase_rastreio))
    .filter((fase) => Number.isFinite(fase) && fase >= 0 && fase <= 3);

  if (fases.length === 0) return null;
  return Math.max(...fases);
}

function inferirStatusPublico(requisicao: Pick<Requisicao, 'status' | 'itens'>): StatusPublico {
  const statusRaw = String(requisicao.status ?? '').trim().toLowerCase();

  if (statusRaw === 'cancelada' || statusRaw === 'cancelado') return 'cancelado';

  const faseMax = parseMaxFase(requisicao.itens);
  if (faseMax === 3) return 'recebido';
  if (faseMax === 2) return 'finalizado';
  if (faseMax === 1) return 'separado';
  if (faseMax === 0) return 'separando';

  if (statusRaw === 'entregue') return 'recebido';
  if (statusRaw === 'enviado') return 'finalizado';
  if (statusRaw === 'separado') return 'separado';
  if (statusRaw === 'em_andamento' || statusRaw === 'aprovada') return 'separando';

  return 'aguardando';
}

function pedidoEstaNaFila(pedido: Pick<Requisicao, 'status' | 'itens'>) {
  const status = inferirStatusPublico(pedido);
  return status !== 'recebido' && status !== 'cancelado';
}

function formatData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrazo(value?: string) {
  if (!value) return null;
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return value;
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extrairMeta(observacao: string | null) {
  const meta: Record<string, string> = {};
  const textos: string[] = [];

  String(observacao || '')
    .split('|')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .forEach((parte) => {
      const idx = parte.indexOf(':');
      if (idx > 0) {
        const chave = parte.slice(0, idx).trim();
        const valor = parte.slice(idx + 1).trim();
        if (['prazo', 'prioridade', 'obs', 'cargo'].includes(chave)) {
          meta[chave] = valor;
          return;
        }
      }
      textos.push(parte);
    });

  return {
    cargo: meta.cargo,
    prazo: formatPrazo(meta.prazo),
    prioridade: meta.prioridade,
    observacao: meta.obs || textos.join(' | '),
  };
}

function useIdentidadePublica(params: URLSearchParams) {
  const [identLocal] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(IDENT_KEY) || '{}') as { nome?: string; tel?: string };
      return parsed || {};
    } catch {
      return {};
    }
  });

  const tel = (params.get('tel') || identLocal.tel || '').replace(/\D/g, '').slice(0, 11);
  const nome = params.get('nome') || identLocal.nome || '';

  return { tel, nome };
}

export function FilaPublica() {
  const [params] = useSearchParams();
  const { tel, nome } = useIdentidadePublica(params);

  const [pedidos, setPedidos] = useState<Requisicao[]>([]);
  const [filaAtiva, setFilaAtiva] = useState<PedidoFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const carregar = useCallback(async (silencioso = false) => {
    if (!tel) {
      setErro('Telefone não informado.');
      setLoading(false);
      return;
    }

    if (silencioso) setAtualizando(true);
    else setLoading(true);
    setErro('');

    try {
      const [pedidosRes, filaRes] = await Promise.all([
        supabase
          .from('requisicoes_almoxarifado')
          .select('id, criado_em, obra, status, itens, observacao')
          .eq('telefone', tel)
          .order('criado_em', { ascending: false })
          .limit(30),
        supabase
          .from('requisicoes_almoxarifado')
          .select('id, criado_em, status, itens')
          .order('criado_em', { ascending: true })
          .limit(500),
      ]);

      if (pedidosRes.error) throw pedidosRes.error;
      if (filaRes.error) console.warn('[FilaPublica] fila geral indisponível:', filaRes.error);

      setPedidos((pedidosRes.data as Requisicao[]) || []);
      setFilaAtiva(((filaRes.data as PedidoFila[]) || []).filter(pedidoEstaNaFila));
      setUltimaAtualizacao(new Date());
    } catch (err) {
      console.error('[FilaPublica] erro ao carregar pedidos:', err);
      setErro('Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }, [tel]);

  useEffect(() => {
    void carregar(false);
  }, [carregar]);

  useEffect(() => {
    if (!tel) return;

    const channel = supabase
      .channel(`fila-publica-${tel}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requisicoes_almoxarifado' },
        () => void carregar(true)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [carregar, tel]);

  const filaIndexById = useMemo(() => {
    const map = new Map<string, number>();
    filaAtiva.forEach((pedido, index) => map.set(pedido.id, index));
    return map;
  }, [filaAtiva]);

  const ativosDoUsuario = pedidos.filter(pedidoEstaNaFila).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#12337a_0,#0d1b3d_40%,#081224_100%)] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-5">
          <Link
            to="/obra"
            className="inline-flex items-center gap-2 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(8,24,64,0.55)] px-3 py-2 text-xs font-bold text-white/95 hover:bg-[rgba(8,24,64,0.75)] transition"
          >
            ← Voltar ao início
          </Link>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_24px_60px_rgba(0,0,0,0.35)] px-5 py-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[#9fb8f5] text-xs font-black uppercase tracking-[0.18em] mb-2">Almoxarifado · Biasi Engenharia</p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-white">Meus Pedidos</h1>
              {nome && <p className="text-[#c8d6ff] text-sm mt-1">Olá, {nome}!</p>}
            </div>
            <button
              type="button"
              onClick={() => void carregar(true)}
              disabled={atualizando}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-wide text-white/90 disabled:opacity-50"
            >
              <RefreshCw size={14} className={atualizando ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3">
              <p className="text-[0.7rem] uppercase tracking-widest text-emerald-200/80 font-black">Ligado ao app</p>
              <p className="text-sm text-emerald-50 mt-1">Atualiza pelo Supabase</p>
            </div>
            <div className="rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3">
              <p className="text-[0.7rem] uppercase tracking-widest text-sky-200/80 font-black">Fila ativa</p>
              <p className="text-sm text-sky-50 mt-1">{ativosDoUsuario} pedido{ativosDoUsuario === 1 ? '' : 's'} seu{ativosDoUsuario === 1 ? '' : 's'} em andamento</p>
            </div>
          </div>

          {ultimaAtualizacao && (
            <p className="mt-4 text-xs text-[#8fa6da]">
              Última atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {loading && <div className="text-center text-[#b8c5eb] py-12">Carregando seus pedidos...</div>}

        {erro && (
          <div className="text-red-200 text-sm bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 text-center">{erro}</div>
        )}

        {!loading && !erro && pedidos.length === 0 && (
          <div className="text-center py-12 rounded-[24px] border border-white/10 bg-white/[0.04]">
            <Package size={30} className="mx-auto mb-3 text-[#8fa6da]" />
            <p className="text-[#c8d6ff]">Nenhum pedido encontrado para este número.</p>
          </div>
        )}

        <div className="space-y-4">
          {pedidos.map((p) => {
            const statusPublico = inferirStatusPublico(p);
            const st = STATUS_LABEL[statusPublico];
            const meta = extrairMeta(p.observacao);
            const filaIndex = filaIndexById.get(p.id);
            const estaNaFila = pedidoEstaNaFila(p);
            const pedidosNaFrente = estaNaFila && filaIndex != null ? filaIndex : 0;
            const posicao = estaNaFila && filaIndex != null ? filaIndex + 1 : null;
            const etapaIndex = Math.max(0, ETAPAS.indexOf(statusPublico));

            return (
              <div key={p.id} className="rounded-[24px] border border-white/10 bg-[#172540]/95 p-4 shadow-[0_18px_38px_rgba(0,0,0,0.25)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-white text-base truncate">{p.obra}</p>
                    <p className="text-[#8fa6da] text-xs mt-1">{formatData(p.criado_em)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-[0.72rem] font-black uppercase tracking-wide ${st.bg} ${st.border} ${st.color}`}>
                    {st.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-[0.68rem] uppercase tracking-widest text-[#8fa6da] font-black">Pedidos na frente</p>
                    <p className="text-2xl font-black text-white mt-1">{estaNaFila ? pedidosNaFrente : 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-[0.68rem] uppercase tracking-widest text-[#8fa6da] font-black">Sua posição</p>
                    <p className="text-2xl font-black text-white mt-1">{posicao ?? (statusPublico === 'recebido' ? 'OK' : '-')}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-1">
                    {ETAPAS.map((etapa, index) => {
                      const ativa = index <= etapaIndex && statusPublico !== 'cancelado';
                      return (
                        <div key={etapa} className="flex-1">
                          <div className={`h-2 rounded-full ${ativa ? 'bg-[#5c9bff]' : 'bg-white/10'}`} />
                          <p className={`mt-1 text-[0.6rem] text-center font-bold ${ativa ? 'text-[#cfe0ff]' : 'text-[#607399]'}`}>
                            {STATUS_LABEL[etapa].label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {(Array.isArray(p.itens) ? p.itens : []).map((it, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#e6edff] border-t border-white/8 pt-2 first:border-t-0 first:pt-0">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#5c9bff] shrink-0" />
                      <span>
                        <strong>{it.quantidade ?? '-'} {it.unidade ?? ''}</strong> · {it.descricao || it.nome || 'Item'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#b8c5eb]">
                  {meta.prazo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/10 px-3 py-1">
                      <Clock size={12} />
                      Prazo: {meta.prazo}
                    </span>
                  )}
                  {meta.prioridade && (
                    <span className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1">
                      Prioridade: {meta.prioridade}
                    </span>
                  )}
                  {meta.cargo && (
                    <span className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1">
                      Cargo: {meta.cargo}
                    </span>
                  )}
                </div>

                {meta.observacao && (
                  <p className="text-xs text-[#9fb0da] mt-3 border-t border-white/10 pt-3">{meta.observacao}</p>
                )}

                <div className="mt-4 flex items-center gap-2 text-[0.78rem] text-[#8fa6da]">
                  {statusPublico === 'recebido' ? <CheckCircle2 size={14} className="text-emerald-300" /> : <Truck size={14} className="text-[#8fb2ff]" />}
                  <span>
                    {statusPublico === 'recebido'
                      ? 'Pedido recebido. Esse status veio do app do almoxarifado.'
                      : 'Quando o almoxarifado avançar no app, essa tela atualiza aqui.'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <a
          href={`/req?tel=${tel}&nome=${encodeURIComponent(nome)}`}
          className="block mt-6 text-center bg-[linear-gradient(180deg,#6257ff,#493fe6)] hover:opacity-95 text-white font-black py-4 px-6 rounded-2xl transition shadow-[0_16px_30px_rgba(78,70,225,0.35)]"
        >
          + Nova Requisição
        </a>

        <p className="text-center text-[#4f638f] text-xs mt-6">BiasiHub · Almoxarifado · Biasi Engenharia e Instalações</p>
      </div>
    </div>
  );
}
