import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Phone, RefreshCw, Search, User } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import type { Requisicao, StatusRequisicao } from '../domain/entities/Requisicao';

type JsonMap = Record<string, unknown>;
type RowHist = Requisicao & {
  telefone?: string | null;
  solicitante_nome?: string | null;
  solicitante?: { nome: string } | null;
};

interface PedidoHist {
  id: string;
  numero: string;
  obra: string;
  status: StatusRequisicao;
  data: string;
  dataIso: string;
  itens: string[];
  observacao: string;
  freteLabel: string;
}

interface GrupoPessoa {
  chave: string;
  nome: string;
  telefone: string;
  pedidos: PedidoHist[];
  totalPedidos: number;
  ultimaData: string;
}

function normalize(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const hasMojibake = /(?:[\u00C2\u00C3][\u0080-\u00BF]|\uFFFD)/.test(raw);
  if (!hasMojibake) return raw;
  const bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0) & 0xff);
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
  if (decoded && !decoded.includes('\uFFFD')) return decoded;
  return raw.replace(/\uFFFD/g, '').trim();
}

function parseObsMeta(observacao: string | null): Record<string, string> {
  if (!observacao) return {};
  const meta: Record<string, string> = {};
  observacao
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const idx = part.indexOf(':');
      if (idx <= 0) return;
      const key = part.slice(0, idx).trim().toLowerCase();
      const value = part.slice(idx + 1).trim();
      if (key) meta[key] = value;
    });
  return meta;
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function itensResumo(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((e): e is JsonMap => Boolean(e) && typeof e === 'object' && !Array.isArray(e))
    .map((e) => {
      const desc = normalize(String(e.descricao ?? e.nome ?? ''));
      const qtd = e.quantidade as number | string | undefined;
      const un = normalize(String(e.unidade ?? ''));
      return `${desc}${qtd != null ? ` · ${qtd}${un ? ' ' + un : ''}` : ''}`.trim();
    })
    .filter(Boolean);
}

function formatarFrete(meta: Record<string, string>): string {
  const tipo = normalize(meta.frete_tipo || '');
  if (!tipo) return '';
  if (tipo === 'terceiro') {
    const nome = normalize(meta.frete_terceiro_nome || '');
    const contato = normalize(meta.frete_terceiro_contato || '');
    return `Terceiro${nome ? ` - ${nome}` : ''}${contato ? ` (${contato})` : ''}`;
  }
  if (tipo === 'proprio') return 'Solicitante retira pessoalmente';
  if (tipo === 'outro') {
    const desc = normalize(meta.frete_outro_descricao || '');
    return `Outro${desc ? ` - ${desc}` : ''}`;
  }
  return 'Biasi Engenharia';
}

const STATUS_LABEL: Record<StatusRequisicao, string> = {
  pendente: 'Aguardando',
  aprovada: 'Em separação',
  entregue: 'Concluído',
  cancelada: 'Cancelada',
};

const STATUS_COLOR: Record<StatusRequisicao, string> = {
  pendente: '#ffca57',
  aprovada: '#5c9bff',
  entregue: '#6be3a5',
  cancelada: '#ff7a9d',
};

export function HistoricoRequisicoes() {
  const [rows, setRows] = useState<RowHist[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [apenasConcluidos, setApenasConcluidos] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('requisicoes_almoxarifado')
        .select('*, telefone, solicitante_nome, solicitante:usuarios!requisicoes_almoxarifado_solicitante_id_fkey(nome)')
        .order('criado_em', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setRows((data || []) as unknown as RowHist[]);
    } catch (err) {
      console.error('[Historico] erro ao carregar:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel('historico-requisicoes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requisicoes_almoxarifado' },
        () => { void carregar(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const grupos = useMemo<GrupoPessoa[]>(() => {
    const map = new Map<string, GrupoPessoa>();
    for (const r of rows) {
      if (apenasConcluidos && r.status !== 'entregue' && r.status !== 'cancelada') continue;

      const meta = parseObsMeta(r.observacao);
      const nome = normalize(r.solicitante?.nome || r.solicitante_nome || meta.solicitante || 'Sem nome');
      const telefone = normalize(r.telefone || meta.telefone || '');
      const chave = (nome + '|' + (telefone || '—')).toLowerCase();

      const pedido: PedidoHist = {
        id: r.id,
        numero: r.id.replace(/-/g, '').slice(-6).toUpperCase(),
        obra: normalize(r.obra),
        status: r.status,
        data: fmt(r.data_solicitacao || r.criado_em),
        dataIso: r.data_solicitacao || r.criado_em,
        itens: itensResumo(r.itens),
        observacao: normalize(meta.obs || ''),
        freteLabel: formatarFrete(meta),
      };

      let grupo = map.get(chave);
      if (!grupo) {
        grupo = { chave, nome, telefone: telefone || '—', pedidos: [], totalPedidos: 0, ultimaData: pedido.dataIso };
        map.set(chave, grupo);
      }
      grupo.pedidos.push(pedido);
      grupo.totalPedidos++;
      if (pedido.dataIso > grupo.ultimaData) grupo.ultimaData = pedido.dataIso;
    }

    const lista = Array.from(map.values());
    const filtro = busca.trim().toLowerCase();
    const filtrado = filtro
      ? lista.filter(
          (g) =>
            g.nome.toLowerCase().includes(filtro) ||
            g.telefone.toLowerCase().includes(filtro) ||
            g.pedidos.some((p) =>
              p.obra.toLowerCase().includes(filtro) ||
              p.numero.toLowerCase().includes(filtro) ||
              p.freteLabel.toLowerCase().includes(filtro)
            )
        )
      : lista;

    filtrado.forEach((g) => g.pedidos.sort((a, b) => (a.dataIso > b.dataIso ? -1 : 1)));
    filtrado.sort((a, b) => (a.ultimaData > b.ultimaData ? -1 : 1));
    return filtrado;
  }, [rows, busca, apenasConcluidos]);

  function toggleGrupo(chave: string) {
    setExpandidas((prev) => {
      const copy = new Set(prev);
      if (copy.has(chave)) copy.delete(chave); else copy.add(chave);
      return copy;
    });
  }

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-[#071b49] to-[#0b2260] text-white p-5 md:p-6">
      <div className="mx-auto w-full max-w-[1240px]">
        <section className="rounded-[24px] border border-[rgba(113,154,255,0.26)] bg-[rgba(17,47,115,0.85)] p-5 md:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="m-0 text-2xl md:text-3xl font-black tracking-tight">Histórico por Pessoa</h1>
              <p className="m-0 mt-1 text-[#b8c8f7] text-sm">
                Tudo que cada pessoa já pediu — com telefone, data e hora. Use para consultar quando precisar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void carregar()}
              className="inline-flex items-center gap-2 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.45)] px-4 py-2.5 text-sm font-bold hover:bg-[rgba(10,30,77,0.6)] transition-colors"
            >
              <RefreshCw size={15} />
              Atualizar
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#89a2e2]" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, telefone, obra ou nº do pedido..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[rgba(113,154,255,0.3)] bg-[rgba(10,30,77,0.45)] text-white placeholder:text-[#7d93d1] text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[#cad8ff] cursor-pointer">
              <input
                type="checkbox"
                checked={apenasConcluidos}
                onChange={(e) => setApenasConcluidos(e.target.checked)}
                className="h-4 w-4 accent-[#7ab2ff]"
              />
              Apenas concluídos/cancelados
            </label>
            <span className="rounded-full border border-[rgba(113,154,255,0.3)] bg-[rgba(10,30,77,0.45)] px-3 py-1.5 text-xs font-extrabold uppercase">
              {grupos.length} pessoa(s)
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[rgba(113,154,255,0.25)] bg-[rgba(10,30,77,0.35)] p-8 text-center text-[#b8c5eb]">
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Carregando histórico...
              </span>
            </div>
          ) : grupos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(113,154,255,0.28)] bg-[rgba(10,30,77,0.25)] p-8 text-center text-[#b8c5eb]">
              Nenhum pedido encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {grupos.map((g) => {
                const aberto = expandidas.has(g.chave);
                return (
                  <article
                    key={g.chave}
                    className="rounded-[18px] border border-[rgba(113,154,255,0.28)] bg-[rgba(10,30,77,0.32)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGrupo(g.chave)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[rgba(10,30,77,0.5)] transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="grid place-items-center w-10 h-10 rounded-full bg-[rgba(113,154,255,0.18)] border border-[rgba(113,154,255,0.35)]">
                          <User size={18} className="text-[#b8c8ff]" />
                        </div>
                        <div>
                          <p className="m-0 font-black text-[1.05rem] text-white">{g.nome}</p>
                          <p className="m-0 mt-0.5 text-xs text-[#b8c8f7] inline-flex items-center gap-1.5">
                            <Phone size={12} />
                            {g.telefone}
                            <span className="ml-2 text-[#89a2e2]">· Último: {fmt(g.ultimaData)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.5)] px-3 py-1 text-xs font-extrabold">
                          {g.totalPedidos} pedido(s)
                        </span>
                        {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {aberto && (
                      <div className="border-t border-[rgba(113,154,255,0.2)] divide-y divide-[rgba(113,154,255,0.14)]">
                        {g.pedidos.map((p) => (
                          <div key={p.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded-full border border-[rgba(120,160,255,0.4)] bg-[rgba(120,160,255,0.15)] px-2.5 py-0.5 text-[0.72rem] font-extrabold tracking-wider">
                                  #{p.numero}
                                </span>
                                <strong className="text-white">{p.obra || '—'}</strong>
                                <span className="text-[#89a2e2] text-xs">· {p.data}</span>
                              </div>
                              <span
                                className="rounded-full px-3 py-0.5 text-[0.7rem] font-extrabold uppercase border"
                                style={{
                                  color: STATUS_COLOR[p.status],
                                  borderColor: STATUS_COLOR[p.status] + '66',
                                  background: STATUS_COLOR[p.status] + '22',
                                }}
                              >
                                {STATUS_LABEL[p.status]}
                              </span>
                            </div>
                            {p.itens.length > 0 && (
                              <ul className="mt-2 text-sm text-[#dce6ff] list-disc pl-5 space-y-0.5">
                                {p.itens.map((l, i) => (
                                  <li key={i}>{l}</li>
                                ))}
                              </ul>
                            )}
                            {p.observacao && (
                              <p className="m-0 mt-1 text-xs italic text-[#b8c8f7]">Obs.: {p.observacao}</p>
                            )}
                            {p.freteLabel && (
                              <p className="m-0 mt-2 inline-flex rounded-full border border-[rgba(54,196,133,0.35)] bg-[rgba(54,196,133,0.12)] px-3 py-1 text-xs font-bold text-[#abf5d1]">
                                Frete: {p.freteLabel}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
