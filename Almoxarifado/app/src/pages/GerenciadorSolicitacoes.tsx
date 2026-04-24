import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2, Play, RefreshCw } from 'lucide-react';
import type { Requisicao, StatusRequisicao } from '../domain/entities/Requisicao';
import { supabase } from '../infrastructure/supabase/client';
import { CameraModal } from '../components/CameraModal';

type EscolhaItem = 'ok' | 'no';
type FaseRastreio = 0 | 1 | 2 | 3;

type JsonMap = Record<string, unknown>;
type RequisicaoComJoin = Requisicao & { solicitante?: { nome: string } | null };

const STORAGE_BUCKET = 'requisicoes';

interface ItemGerenciavel {
  id: string;
  descricao: string;
  quantidadeLabel: string;
  choice: EscolhaItem;
  // photoData = foto de conferência do almoxarifado (primeira foto do array, ou a única enviada pelo almox)
  photoData: string;
  // Todas as fotos — do Vercel (solicitante) + as do almoxarifado. Em ordem.
  fotosUrls: string[];
  observacaoItem: string;
  faseRastreio: FaseRastreio;
  raw: JsonMap;
}

interface AnexoGeral {
  url: string;
  tipo: 'audio' | 'video' | 'imagem' | 'doc';
  nome: string;
}

interface CardSolicitacao {
  id: string;
  obra: string;
  status: StatusRequisicao;
  solicitante: string;
  cargo: string;
  prazo: string;
  prioridade: string;
  dataSolicitacao: string;
  criadoEm: string;
  iniciadoEm: string | null;
  resumo: string;
  observacaoGeral: string;
  anexosGerais: AnexoGeral[];
  itens: ItemGerenciavel[];
}

const STATUS_LABEL: Record<StatusRequisicao, string> = {
  pendente: 'Aguardando',
  aprovada: 'Em separação',
  entregue: 'Concluído',
  cancelada: 'Cancelada',
};

const STATUS_STYLE: Record<StatusRequisicao, string> = {
  pendente: 'text-[#ffca57] border-[rgba(255,202,87,0.35)] bg-[rgba(255,202,87,0.12)]',
  aprovada: 'text-[#89b6ff] border-[rgba(92,155,255,0.35)] bg-[rgba(92,155,255,0.12)]',
  entregue: 'text-[#8dffca] border-[rgba(54,196,133,0.35)] bg-[rgba(54,196,133,0.12)]',
  cancelada: 'text-[#ff9797] border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.12)]',
};

function normalizeDisplayText(value: string | null | undefined): string {
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

function toFase(value: unknown, fallback: FaseRastreio): FaseRastreio {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    if (parsed <= 0) return 0;
    if (parsed >= 3) return 3;
    return parsed as FaseRastreio;
  }
  return fallback;
}

function faseFallback(status: StatusRequisicao): FaseRastreio {
  if (status === 'entregue') return 3;
  if (status === 'aprovada') return 1;
  return 0;
}

function parseItems(rawItems: unknown, status: StatusRequisicao): ItemGerenciavel[] {
  const list = Array.isArray(rawItems) ? rawItems : [];
  const fallback = faseFallback(status);

  return list
    .filter((entry): entry is JsonMap => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry, idx) => {
      const descricao = normalizeDisplayText(String(entry.descricao ?? entry.nome ?? `Item ${idx + 1}`));
      const quantidade = entry.quantidade;
      const unidade = normalizeDisplayText(String(entry.unidade ?? '').trim());
      const quantidadeLabel = `${quantidade ?? '-'}${unidade ? ` ${unidade}` : ''}`.trim();

      const choiceRaw = String(entry.choice_estoque ?? entry.choice ?? 'ok').toLowerCase();
      const choice: EscolhaItem = choiceRaw === 'no' ? 'no' : 'ok';

      const fotoRaw = entry.foto_material ?? entry.photoData;
      const fotoLegacy = typeof fotoRaw === 'string' ? fotoRaw : '';
      const fotosArrRaw = Array.isArray(entry.fotos_urls) ? entry.fotos_urls : [];
      const fotosArr = fotosArrRaw
        .map((v) => (typeof v === 'string' ? v : ''))
        .filter(Boolean);
      // Mescla: fotos do Vercel (solicitante) + foto do almox (legacy), sem duplicar
      const fotosUrls = Array.from(new Set([...fotosArr, ...(fotoLegacy ? [fotoLegacy] : [])]));
      const photoData = fotoLegacy || fotosUrls[0] || '';

      const obsItemRaw = entry.observacao ?? entry.obs ?? '';
      const observacaoItem = normalizeDisplayText(typeof obsItemRaw === 'string' ? obsItemRaw : '');

      return {
        id: String(entry.item_id ?? entry.id ?? `${idx}`),
        descricao,
        quantidadeLabel,
        choice,
        photoData,
        fotosUrls,
        observacaoItem,
        faseRastreio: toFase(entry.fase_rastreio, fallback),
        raw: entry,
      };
    });
}

function detectarTipoAnexo(url: string): AnexoGeral['tipo'] {
  const lower = url.toLowerCase().split('?')[0];
  if (/\.(mp3|m4a|ogg|wav|aac|webm)$/.test(lower) && /audio|voice|rec/.test(lower)) return 'audio';
  if (/\.(mp3|m4a|ogg|wav|aac)$/.test(lower)) return 'audio';
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(lower)) return 'video';
  if (/\.(jpg|jpeg|png|gif|webp|bmp|heic)$/.test(lower)) return 'imagem';
  return 'doc';
}

function parseAnexosGerais(observacao: string | null): AnexoGeral[] {
  if (!observacao) return [];
  const meta = parseObsMeta(observacao);
  const raw = meta['anexos_urls'] || meta['anexos'] || '';
  if (!raw) return [];
  return raw
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url) => {
      const tipo = detectarTipoAnexo(url);
      const nome = decodeURIComponent(url.split('/').pop() || url).split('?')[0];
      return { url, tipo, nome };
    });
}

function formatarData(data: string): string {
  try {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return data;
  }
}

function mapRowToCard(row: RequisicaoComJoin): CardSolicitacao {
  const meta = parseObsMeta(row.observacao);
  const itens = parseItems(row.itens, row.status);
  const resumo = itens
    .slice(0, 2)
    .map((item) => item.descricao)
    .join(' | ');

  return {
    id: row.id,
    obra: normalizeDisplayText(row.obra),
    status: row.status,
    solicitante: normalizeDisplayText(row.solicitante?.nome || (row as RequisicaoComJoin & { solicitante_nome?: string }).solicitante_nome || '-'),
    cargo: normalizeDisplayText(meta.cargo || '-'),
    prazo: normalizeDisplayText(meta.prazo || '-'),
    prioridade: normalizeDisplayText(meta.prioridade || 'normal').toUpperCase(),
    dataSolicitacao: formatarData(row.data_solicitacao),
    criadoEm: row.criado_em,
    iniciadoEm: row.iniciado_em ?? null,
    resumo: resumo || 'Sem itens cadastrados',
    observacaoGeral: normalizeDisplayText(row.observacao || ''),
    anexosGerais: parseAnexosGerais(row.observacao),
    itens,
  };
}

function applyItemMeta(item: ItemGerenciavel): JsonMap {
  return {
    ...item.raw,
    choice_estoque: item.choice,
    foto_material: item.photoData || null,
    fotos_urls: item.fotosUrls,
    fase_rastreio: item.faseRastreio,
  };
}

function requestNeedsPhotos(card: CardSolicitacao): ItemGerenciavel[] {
  return card.itens.filter((item) => item.choice === 'ok');
}

function requestHasRequiredPhotos(card: CardSolicitacao): boolean {
  return requestNeedsPhotos(card).every((item) => Boolean(item.photoData));
}

async function uploadPhoto(file: File, cardId: string, itemId: string): Promise<string | null> {
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `almox/${cardId}/${itemId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (error) {
      console.warn('[GerenciadorSolicitacoes] upload falhou:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl || null;
  } catch (err) {
    console.warn('[GerenciadorSolicitacoes] upload exception:', err);
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function GerenciadorSolicitacoes() {
  const [cards, setCards] = useState<CardSolicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [camTarget, setCamTarget] = useState<{ cardId: string; itemId: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCards = useMemo(
    () => cards.filter((card) => card.status !== 'cancelada' && card.status !== 'entregue'),
    [cards]
  );
  const pendingCount = useMemo(
    () => activeCards.flatMap((card) => card.itens).filter((item) => item.choice === 'no').length,
    [activeCards]
  );

  // Ordenação: FIFO (mais antigo primeiro). URGENTE sobe para o topo.
  const orderedCards = useMemo(() => {
    const copy = [...activeCards];
    copy.sort((a, b) => {
      const aUrg = a.prioridade === 'URGENTE' ? 0 : 1;
      const bUrg = b.prioridade === 'URGENTE' ? 0 : 1;
      if (aUrg !== bUrg) return aUrg - bUrg;
      return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
    });
    return copy;
  }, [activeCards]);

  const toolbarSummary = useMemo(() => {
    if (activeCards.length === 0) return 'Sem solicitações ativas';
    if (pendingCount === 0) return 'Todos os itens conferidos';
    if (pendingCount === 1) return '1 item precisa de compra';
    return `${pendingCount} itens precisam de compra`;
  }, [activeCards.length, pendingCount]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2300);
  }

  function updateCardState(cardId: string, updater: (card: CardSolicitacao) => CardSolicitacao) {
    setCards((prev) => prev.map((card) => (card.id === cardId ? updater(card) : card)));
  }

  async function carregarSolicitacoes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('requisicoes_almoxarifado')
        .select('*, solicitante_nome, telefone, solicitante:usuarios!requisicoes_almoxarifado_solicitante_id_fkey(nome)')
        .in('status', ['pendente', 'aprovada'])
        .order('criado_em', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as RequisicaoComJoin[];
      setCards(rows.map(mapRowToCard));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível carregar as solicitações.';
      showToast(msg);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarSolicitacoes();
  }, []);

  // Realtime: recarregar quando qualquer requisição mudar
  useEffect(() => {
    const channel = supabase
      .channel('gerenciador-solicitacoes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requisicoes_almoxarifado' },
        () => {
          void carregarSolicitacoes();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function persistCard(
    card: CardSolicitacao,
    nextItems: ItemGerenciavel[],
    nextStatus?: StatusRequisicao,
    extraUpdates?: Record<string, unknown>
  ) {
    setSavingId(card.id);

    const payloadItems = nextItems.map(applyItemMeta);
    const updates: Record<string, unknown> = { itens: payloadItems, ...extraUpdates };
    if (nextStatus) updates.status = nextStatus;

    let { error } = await supabase.from('requisicoes_almoxarifado').update(updates).eq('id', card.id);
    // Fallback: se a coluna nova (iniciado_em/finalizado_em/separador_id) não existir na base,
    // remove os campos extras e tenta de novo — assim a baixa funciona mesmo sem a migration rodada.
    if (error && /iniciado_em|finalizado_em|separador_id|column/i.test(error.message)) {
      const fallback: Record<string, unknown> = { itens: payloadItems };
      if (nextStatus) fallback.status = nextStatus;
      const retry = await supabase.from('requisicoes_almoxarifado').update(fallback).eq('id', card.id);
      error = retry.error;
      if (!error) {
        console.warn('[GerenciadorSolicitacoes] update via fallback (sem iniciado_em/finalizado_em). Rode a migration 20260423 para habilitar cronômetro de separação.');
      }
    }
    if (error) throw error;

    setSavingId(null);
  }

  async function salvarAlteracoesLocais(
    card: CardSolicitacao,
    nextItems: ItemGerenciavel[],
    nextStatus?: StatusRequisicao,
    successMessage?: string,
    extraUpdates?: Record<string, unknown>
  ) {
    const optimisticStatus = nextStatus ?? card.status;

    updateCardState(card.id, (current) => ({
      ...current,
      itens: nextItems,
      status: optimisticStatus,
      iniciadoEm:
        extraUpdates && typeof extraUpdates.iniciado_em === 'string'
          ? (extraUpdates.iniciado_em as string)
          : current.iniciadoEm,
    }));

    try {
      await persistCard(card, nextItems, nextStatus, extraUpdates);
      if (successMessage) showToast(successMessage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar as alterações.';
      showToast(msg);
      await carregarSolicitacoes();
    } finally {
      setSavingId(null);
    }
  }

  function handleChoiceChange(card: CardSolicitacao, itemId: string, choice: EscolhaItem) {
    const nextItems = card.itens.map((item) => {
      if (item.id !== itemId) return item;
      if (choice === 'no') return { ...item, choice, photoData: '', fotosUrls: [] };
      return { ...item, choice };
    });

    void salvarAlteracoesLocais(card, nextItems, undefined, 'Conferência atualizada.');
  }

  async function handleCameraCapture(file: File) {
    const target = camTarget;
    setCamTarget(null);
    if (!target) return;
    const card = cards.find((c) => c.id === target.cardId);
    if (!card) return;

    showToast('Enviando foto...');
    let photoRef = await uploadPhoto(file, target.cardId, target.itemId);
    if (!photoRef) {
      // fallback: embute base64 (funciona offline, mas Vercel não verá)
      try {
        photoRef = await fileToDataUrl(file);
      } catch {
        photoRef = '';
      }
    }
    if (!photoRef) {
      showToast('Falha ao registrar foto.');
      return;
    }

    const nextItems = card.itens.map((item) =>
      item.id === target.itemId
        ? {
            ...item,
            photoData: photoRef as string,
            fotosUrls: Array.from(new Set([...(item.fotosUrls || []), photoRef as string])),
          }
        : item
    );
    void salvarAlteracoesLocais(card, nextItems, undefined, 'Foto registrada.');
  }

  function handleDeletePhoto(card: CardSolicitacao, itemId: string) {
    const nextItems = card.itens.map((item) => {
      if (item.id !== itemId) return item;
      // Remove a foto do almox (photoData) do array, preservando as do solicitante (Vercel)
      const semAlmox = (item.fotosUrls || []).filter((u) => u !== item.photoData);
      return { ...item, photoData: '', fotosUrls: semAlmox };
    });
    void salvarAlteracoesLocais(card, nextItems, undefined, 'Foto removida.');
  }

  function handleSaveCard(card: CardSolicitacao) {
    void salvarAlteracoesLocais(card, card.itens, undefined, 'Conferência salva.');
  }

  function handleIniciarSeparacao(card: CardSolicitacao) {
    const nextItems = card.itens.map((item) => ({
      ...item,
      faseRastreio: (item.faseRastreio < 1 ? 1 : item.faseRastreio) as FaseRastreio,
    }));
    void salvarAlteracoesLocais(card, nextItems, 'aprovada', 'Separação iniciada.', {
      iniciado_em: new Date().toISOString(),
    });
  }

  function handleDarBaixa(card: CardSolicitacao) {
    if (!requestHasRequiredPhotos(card)) {
      const confirmarSemFoto = window.confirm(
        'Existem itens marcados como "Sim" sem foto. Deseja continuar mesmo assim?'
      );
      if (!confirmarSemFoto) {
        showToast('Baixa cancelada. Adicione as fotos para continuar.');
        return;
      }
    }

    const nextItems = card.itens.map((item) => ({
      ...item,
      faseRastreio: 3 as FaseRastreio,
    }));
    // Concluir requisição: marca entregue (some da lista) e registra finalizado_em
    void salvarAlteracoesLocais(card, nextItems, 'entregue', 'Requisição concluída.', {
      finalizado_em: new Date().toISOString(),
    });
  }

  function handleCancelarBaixa(card: CardSolicitacao) {
    const nextItems = card.itens.map((item) => ({
      ...item,
      faseRastreio: 0 as FaseRastreio,
    }));
    void salvarAlteracoesLocais(card, nextItems, 'pendente', 'Separação cancelada.', {
      iniciado_em: null,
    });
  }

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-[#071b49] to-[#0b2260] text-white p-5 md:p-6">
      <div className="mx-auto w-full max-w-[1240px]">
        <section className="rounded-[24px] border border-[rgba(113,154,255,0.26)] bg-[rgba(17,47,115,0.85)] p-5 md:p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 className="m-0 text-2xl md:text-3xl font-black tracking-tight">Gerenciar Solicitações</h1>
            <button
              type="button"
              onClick={() => {
                void carregarSolicitacoes();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.45)] px-4 py-2.5 text-sm font-bold hover:bg-[rgba(10,30,77,0.6)] transition-colors"
            >
              <RefreshCw size={15} />
              Atualizar
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5 mb-5">
            <span className="rounded-full border border-[rgba(113,154,255,0.3)] bg-[rgba(10,30,77,0.45)] px-3 py-1.5 text-xs font-extrabold uppercase">
              Fila: {activeCards.length} solicitações
            </span>
            <span className="rounded-full border border-[rgba(113,154,255,0.3)] bg-[rgba(10,30,77,0.45)] px-3 py-1.5 text-xs font-extrabold uppercase">
              Itens para compra: {pendingCount}
            </span>
            <span className="rounded-full border border-[rgba(113,154,255,0.3)] bg-[rgba(10,30,77,0.45)] px-3 py-1.5 text-xs font-extrabold uppercase">
              {toolbarSummary}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[rgba(113,154,255,0.25)] bg-[rgba(10,30,77,0.35)] p-8 text-center text-[#b8c5eb]">
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Carregando solicitações...
              </span>
            </div>
          ) : orderedCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(113,154,255,0.28)] bg-[rgba(10,30,77,0.25)] p-8 text-center text-[#b8c5eb]">
              Nenhuma solicitação ativa.
            </div>
          ) : (
            <div className="space-y-4">
              {orderedCards.map((card, idxFila) => {
                const required = requestNeedsPhotos(card);
                const ready = required.filter((item) => item.photoData).length;
                const photosComplete = required.length === 0 || ready === required.length;
                const isSaving = savingId === card.id;
                const isUrgente = card.prioridade === 'URGENTE';
                const posicao = idxFila + 1;

                return (
                  <article
                    key={card.id}
                    className={`rounded-[20px] border p-4 md:p-5 ${
                      isUrgente
                        ? 'border-[rgba(255,107,107,0.7)] bg-[rgba(80,10,20,0.35)] shadow-[0_0_0_2px_rgba(255,107,107,0.35),0_12px_32px_rgba(255,50,80,0.25)] animate-pulse-slow'
                        : 'border-[rgba(113,154,255,0.28)] bg-[rgba(10,30,77,0.32)]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-full border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.55)] px-2.5 py-1 text-[0.7rem] font-extrabold">
                            #{posicao} na fila
                          </span>
                          {isUrgente && (
                            <span className="rounded-full border border-[rgba(255,107,107,0.7)] bg-[rgba(255,107,107,0.18)] px-2.5 py-1 text-[0.7rem] font-extrabold text-[#ffb4b4] uppercase tracking-wider">
                              🚨 URGENTE
                            </span>
                          )}
                        </div>
                        <h2 className="m-0 mt-2 text-[1.5rem] font-black tracking-tight">{card.obra}</h2>
                        <p className="m-0 mt-1 text-[#d4e0ff] text-sm md:text-base">{card.resumo}</p>
                        <p className="m-0 mt-2 text-[#9db2e7] text-xs md:text-sm">
                          Solicitante: {card.solicitante} | Cargo: {card.cargo} | Data: {card.dataSolicitacao} | Prazo: {card.prazo}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-wide ${STATUS_STYLE[card.status]}`}>
                          {STATUS_LABEL[card.status]}
                        </span>
                      </div>
                    </div>

                    {card.anexosGerais.length > 0 && (
                      <div className="mb-3 rounded-2xl border border-[rgba(113,154,255,0.23)] bg-[rgba(10,30,77,0.28)] p-3">
                        <div className="mb-2 text-[0.72rem] font-extrabold uppercase tracking-wider text-[#dce6ff]">
                          Anexos do solicitante ({card.anexosGerais.length})
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {card.anexosGerais.map((anexo, i) => (
                            <div
                              key={`${card.id}-anexo-${i}`}
                              className="rounded-lg border border-[rgba(113,154,255,0.28)] bg-[rgba(10,30,77,0.45)] p-2 flex flex-col gap-1"
                            >
                              {anexo.tipo === 'audio' && (
                                <audio controls src={anexo.url} className="max-w-[280px]" />
                              )}
                              {anexo.tipo === 'video' && (
                                <video controls src={anexo.url} className="max-w-[280px] max-h-[180px]" />
                              )}
                              {anexo.tipo === 'imagem' && (
                                <a href={anexo.url} target="_blank" rel="noreferrer">
                                  <img src={anexo.url} alt={anexo.nome} className="max-w-[140px] max-h-[140px] object-cover rounded" />
                                </a>
                              )}
                              {anexo.tipo === 'doc' && (
                                <a
                                  href={anexo.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-[#89b6ff] underline"
                                >
                                  {anexo.nome || 'Arquivo'}
                                </a>
                              )}
                              <span className="text-[10px] uppercase tracking-wider text-[#9db2e7]">{anexo.tipo}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-[rgba(113,154,255,0.23)] overflow-hidden">
                      <div className="hidden md:grid grid-cols-[2fr,110px,120px,120px,130px,260px] gap-2 bg-[rgba(255,255,255,0.05)] px-4 py-3 text-[0.72rem] font-extrabold uppercase tracking-wider text-[#dce6ff]">
                        <div>Item</div>
                        <div>Qtd.</div>
                        <div>Tem estoque</div>
                        <div>Sem estoque</div>
                        <div>Status</div>
                        <div>Foto</div>
                      </div>

                      <div className="divide-y divide-[rgba(113,154,255,0.18)]">
                        {card.itens.map((item, idx) => {
                          const statusItem = item.choice === 'ok' ? 'Separar' : 'Comprar';
                          const statusClass = item.choice === 'ok' ? 'text-[#8dffca]' : 'text-[#ffca57]';

                          return (
                            <div key={`${card.id}-${item.id}-${idx}`} className="grid gap-3 px-4 py-3 md:grid-cols-[2fr,110px,120px,120px,130px,260px]">
                              <div>
                                <div className="text-sm md:text-base font-bold">{item.descricao}</div>
                                <div className="md:hidden mt-1 text-xs text-[#9db2e7]">Qtd: {item.quantidadeLabel}</div>
                                {item.observacaoItem && (
                                  <div className="mt-1 text-[11px] italic text-[#cbd6ff] whitespace-pre-wrap">
                                    &ldquo;{item.observacaoItem}&rdquo;
                                  </div>
                                )}
                              </div>

                              <div className="hidden md:flex items-center text-sm text-[#d4e0ff]">{item.quantidadeLabel}</div>

                              <label className="inline-flex items-center gap-2 text-sm text-[#8dffca]">
                                <input
                                  type="checkbox"
                                  checked={item.choice === 'ok'}
                                  disabled={isSaving}
                                  onChange={() => handleChoiceChange(card, item.id, 'ok')}
                                  className="h-4 w-4 accent-[#7ab2ff]"
                                />
                                Sim
                              </label>

                              <label className="inline-flex items-center gap-2 text-sm text-[#ffb7bf]">
                                <input
                                  type="checkbox"
                                  checked={item.choice === 'no'}
                                  disabled={isSaving}
                                  onChange={() => handleChoiceChange(card, item.id, 'no')}
                                  className="h-4 w-4 accent-[#7ab2ff]"
                                />
                                Não
                              </label>

                              <div className={`inline-flex items-center text-sm font-bold ${statusClass}`}>{statusItem}</div>

                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setCamTarget({ cardId: card.id, itemId: item.id })}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(113,154,255,0.35)] bg-[rgba(24,59,141,0.65)] px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                                  >
                                    <Camera size={13} />
                                    Tirar foto
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSaving || !item.photoData}
                                    onClick={() => handleDeletePhoto(card, item.id)}
                                    className="inline-flex items-center rounded-lg border border-[rgba(255,122,157,0.4)] bg-[rgba(255,122,157,0.12)] px-3 py-1.5 text-xs font-bold text-[#ffd9e3] disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Excluir
                                  </button>
                                </div>

                                {item.fotosUrls.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-1.5 max-w-[260px]">
                                    {item.fotosUrls.map((url, i) => (
                                      <a
                                        key={`${item.id}-foto-${i}`}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block h-[70px] w-full overflow-hidden rounded-lg border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.35)]"
                                        title={url === item.photoData ? 'Foto do almoxarifado' : 'Foto do solicitante'}
                                      >
                                        <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="h-[70px] w-full max-w-[220px] overflow-hidden rounded-lg border border-dashed border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.35)] text-[0.72rem] text-[#cad8ff] flex items-center justify-center">
                                    Sem foto
                                  </div>
                                )}
                                {item.fotosUrls.length > 0 && (
                                  <div className="text-[10px] text-[#9db2e7]">
                                    {item.fotosUrls.length} foto(s){item.photoData ? ' • ✓ almox' : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-[rgba(113,154,255,0.18)] bg-[rgba(255,255,255,0.03)]">
                        <span className="text-sm text-[#cad8ff]">
                          {requestNeedsPhotos(card).length === 0
                            ? 'Sem foto obrigatória (todos os itens marcados como Não).'
                            : photosComplete
                            ? 'Fotos obrigatórias completas.'
                            : `Fotos obrigatórias pendentes (${ready}/${requestNeedsPhotos(card).length}).`}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-[0.72rem] font-extrabold uppercase ${
                            photosComplete
                              ? 'text-[#8dffca] border-[rgba(54,196,133,0.35)] bg-[rgba(54,196,133,0.12)]'
                              : 'text-[#ffca57] border-[rgba(255,202,87,0.35)] bg-[rgba(255,202,87,0.12)]'
                          }`}
                        >
                          {photosComplete ? 'Pronto para baixa' : 'Fotos pendentes'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.status === 'pendente' && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleIniciarSeparacao(card)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(92,155,255,0.5)] bg-[rgba(92,155,255,0.18)] px-4 py-2 text-sm font-bold text-[#b8d3ff] disabled:opacity-50"
                        >
                          <Play size={14} />
                          Iniciar separação
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveCard(card)}
                        className="inline-flex items-center rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(24,59,141,0.65)] px-4 py-2 text-sm font-bold disabled:opacity-50"
                      >
                        Salvar conferência
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleDarBaixa(card)}
                        className="inline-flex items-center rounded-xl border border-[rgba(54,196,133,0.35)] bg-[rgba(54,196,133,0.15)] px-4 py-2 text-sm font-bold text-[#8dffca] disabled:opacity-50"
                      >
                        Concluir requisição
                      </button>
                      {card.status === 'aprovada' && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleCancelarBaixa(card)}
                          className="inline-flex items-center rounded-xl border border-[rgba(255,122,157,0.4)] bg-[rgba(255,122,157,0.12)] px-4 py-2 text-sm font-bold text-[#ffd9e3] disabled:opacity-50"
                        >
                          Cancelar separação
                        </button>
                      )}

                      {isSaving && (
                        <span className="inline-flex items-center gap-2 text-sm text-[#b8c5eb]">
                          <Loader2 size={15} className="animate-spin" /> Salvando...
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {camTarget && (
        <CameraModal
          mode="photo"
          onCapture={(file) => {
            void handleCameraCapture(file);
          }}
          onClose={() => setCamTarget(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,31,78,0.95)] px-4 py-2.5 text-sm font-bold shadow-2xl z-[120]">
          {toast}
        </div>
      )}
    </div>
  );
}
