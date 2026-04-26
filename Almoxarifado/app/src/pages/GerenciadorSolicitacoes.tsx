import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Play, RefreshCw, XCircle } from 'lucide-react';
import type { Requisicao, StatusRequisicao } from '../domain/entities/Requisicao';
import { supabase } from '../infrastructure/supabase/client';
import { CameraModal } from '../components/CameraModal';
import { useAuth } from '../context/AuthContext';

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
  tipo: string;
  usoFrotaLabel: string;
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
  devolucao: string;
  prioridade: string;
  dataSolicitacao: string;
  criadoEm: string;
  iniciadoEm: string | null;
  solicitanteId: string | null;
  resumo: string;
  observacaoGeral: string;
  isFrota: boolean;
  entregaSolicitada: boolean;
  frotaStatus: string;
  motivoNegativa: string;
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

function metaSim(value: unknown): boolean {
  return ['sim', 's', 'true', '1', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function cleanMetaValue(value: unknown): string {
  return String(value ?? '').replace(/\|/g, '/').trim();
}

function upsertObsMeta(observacao: string | null, patch: Record<string, unknown>): string {
  const keys = new Set(Object.keys(patch).map((key) => key.toLowerCase()));
  const kept = String(observacao || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const idx = part.indexOf(':');
      if (idx <= 0) return true;
      return !keys.has(part.slice(0, idx).trim().toLowerCase());
    });

  const next = Object.entries(patch)
    .map(([key, value]) => [key, cleanMetaValue(value)] as const)
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `${key}:${value}`);

  return [...kept, ...next].join(' | ');
}

function dateOnly(value: string | null | undefined): string {
  if (!value || value === '-') return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
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
      const tipo = String(entry.tipo ?? '').trim().toLowerCase();
      const usoRaw = normalizeDisplayText(String(entry.uso_frota_label ?? entry.uso_frota ?? '').trim());
      const usoFrotaLabel =
        usoRaw === 'visitar_obra' ? 'Visitar obra' : usoRaw === 'outros' ? 'Outros' : usoRaw;

      return {
        id: String(entry.item_id ?? entry.id ?? `${idx}`),
        descricao,
        quantidadeLabel,
        choice,
        photoData,
        fotosUrls,
        observacaoItem,
        tipo,
        usoFrotaLabel,
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
  const status = (row.status || 'pendente') as StatusRequisicao;
  const itens = parseItems(row.itens, status);
  const isFrota = itens.some((item) => item.tipo === 'carro' || Boolean(item.raw.placa || item.raw.modelo));
  const resumo = itens
    .slice(0, 2)
    .map((item) => item.descricao)
    .join(' | ');

  return {
    id: row.id,
    obra: normalizeDisplayText(row.obra),
    status,
    solicitante: normalizeDisplayText(row.solicitante?.nome || (row as RequisicaoComJoin & { solicitante_nome?: string }).solicitante_nome || '-'),
    solicitanteId: row.solicitante_id ?? null,
    cargo: normalizeDisplayText(meta.cargo || '-'),
    prazo: normalizeDisplayText(meta.prazo || '-'),
    devolucao: normalizeDisplayText(meta.devolucao || '-'),
    prioridade: normalizeDisplayText(meta.prioridade || 'normal').toUpperCase(),
    dataSolicitacao: formatarData(row.data_solicitacao),
    criadoEm: row.criado_em,
    iniciadoEm: row.iniciado_em ?? null,
    resumo: resumo || 'Sem itens cadastrados',
    observacaoGeral: normalizeDisplayText(row.observacao || ''),
    isFrota,
    entregaSolicitada: metaSim(meta.entrega || meta.entrega_solicitada),
    frotaStatus: normalizeDisplayText(meta.frota_status || ''),
    motivoNegativa: normalizeDisplayText(meta.motivo_negativa || meta.frota_motivo_negativa || ''),
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
  if (card.isFrota) return [];
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
  const { usuario } = useAuth();
  const [cards, setCards] = useState<CardSolicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [camTarget, setCamTarget] = useState<{ cardId: string; itemId: string } | null>(null);
  const [denyTarget, setDenyTarget] = useState<CardSolicitacao | null>(null);
  const [denyMotivo, setDenyMotivo] = useState('');
  const [freteTarget, setFreteTarget] = useState<CardSolicitacao | null>(null);
  const [freteTipo, setFreteTipo] = useState<'biasi' | 'terceiro'>('biasi');
  const [freteTerceiroNome, setFreteTerceiroNome] = useState('');
  const [freteTerceiroContato, setFreteTerceiroContato] = useState('');
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
        .or('status.is.null,status.in.(pendente,aprovada)')
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
      const fallback: Record<string, unknown> = { ...updates, itens: payloadItems };
      delete fallback.iniciado_em;
      delete fallback.finalizado_em;
      delete fallback.separador_id;
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
  ): Promise<boolean> {
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
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar as alterações.';
      showToast(msg);
      await carregarSolicitacoes();
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function registrarMovimentacoesSaida(card: CardSolicitacao, nextItems: ItemGerenciavel[]) {
    if (card.isFrota) return;
    if (!usuario?.id) {
      showToast('Requisição concluída, mas usuário não identificado para movimentação.');
      return;
    }

    const rows = nextItems
      .filter((item) => item.choice === 'ok' && item.raw.item_id)
      .map((item) => ({
        item_id: String(item.raw.item_id),
        tipo: 'saida',
        quantidade: Number(item.raw.quantidade ?? 0) || 1,
        obra: card.obra,
        observacao: `Saída vinculada à requisição ${card.id}`,
        data: new Date().toISOString().slice(0, 10),
        responsavel_id: usuario.id,
      }));

    if (rows.length === 0) return;
    const { error } = await supabase.from('movimentacoes_almoxarifado').insert(rows);
    if (error) {
      console.warn('[GerenciadorSolicitacoes] falha ao registrar movimentações:', error.message);
      showToast(`Requisição concluída, mas a movimentação não foi registrada: ${error.message}`);
    }
  }

  async function criarAgendamentoFrota(card: CardSolicitacao) {
    const veiculo = card.itens.find((item) => item.tipo === 'carro' || item.raw.placa || item.raw.modelo);
    if (!veiculo?.raw.item_id) return;

    const inicio = dateOnly(card.prazo);
    const fimBase = dateOnly(card.devolucao || card.prazo);
    const fim = fimBase < inicio ? inicio : fimBase;

    const { error } = await supabase.from('agendamentos_almoxarifado').insert({
      tipo: 'veiculo',
      item_id: String(veiculo.raw.item_id),
      item_descricao: veiculo.descricao,
      solicitante_id: usuario?.id ?? null,
      solicitante_nome: card.solicitante,
      data_inicio: inicio,
      data_fim: fim,
      descricao: `Frota liberada pela requisição ${card.id}. Obra: ${card.obra}. Uso: ${veiculo.observacaoItem || veiculo.usoFrotaLabel || '-'}`,
      status: 'ativo',
    });

    if (error) {
      console.warn('[GerenciadorSolicitacoes] falha ao criar agendamento:', error.message);
      showToast(`Veículo liberado, mas o calendário não foi atualizado: ${error.message}`);
    }
  }

  function usuarioDecisaoLabel() {
    return usuario?.nome || usuario?.email || usuario?.id || 'Almoxarifado';
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
    const now = new Date().toISOString();
    const observacao = upsertObsMeta(card.observacaoGeral, {
      decisao: 'aprovada',
      aprovado_em: now,
      decidido_por: usuarioDecisaoLabel(),
    });
    void salvarAlteracoesLocais(card, nextItems, 'aprovada', 'Separação iniciada.', {
      iniciado_em: now,
      observacao,
    });
  }

  function handleLiberarFrota(card: CardSolicitacao) {
    setFreteTarget(card);
    setFreteTipo('biasi');
    setFreteTerceiroNome('');
    setFreteTerceiroContato('');
  }

  function confirmarLiberarFrota() {
    const card = freteTarget;
    if (!card) return;
    if (freteTipo === 'terceiro' && !freteTerceiroNome.trim()) {
      showToast('Informe o nome da empresa/motorista do frete terceiro.');
      return;
    }
    const now = new Date().toISOString();
    const nextItems = card.itens.map((item) => ({
      ...item,
      faseRastreio: (item.faseRastreio < 1 ? 1 : item.faseRastreio) as FaseRastreio,
    }));
    const observacao = upsertObsMeta(card.observacaoGeral, {
      decisao: 'frota_liberada',
      frota_status: 'liberada',
      frota_liberado_em: now,
      frota_decidido_por: usuarioDecisaoLabel(),
      aprovado_em: now,
      decidido_por: usuarioDecisaoLabel(),
      frete_tipo: freteTipo,
      frete_terceiro_nome: freteTipo === 'terceiro' ? freteTerceiroNome.trim() : '',
      frete_terceiro_contato: freteTipo === 'terceiro' ? freteTerceiroContato.trim() : '',
    });

    setFreteTarget(null);
    void (async () => {
      const ok = await salvarAlteracoesLocais(card, nextItems, 'aprovada', 'Veículo liberado.', {
        iniciado_em: now,
        observacao,
      });
      if (ok) await criarAgendamentoFrota(card);
    })();
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
    void (async () => {
      const ok = await salvarAlteracoesLocais(card, nextItems, 'entregue', 'Requisição concluída.', {
        finalizado_em: new Date().toISOString(),
      });
      if (ok) await registrarMovimentacoesSaida(card, nextItems);
    })();
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

  function abrirNegativa(card: CardSolicitacao) {
    setDenyTarget(card);
    setDenyMotivo('');
  }

  function confirmarNegativa() {
    const card = denyTarget;
    const motivo = denyMotivo.trim();
    if (!card) return;
    if (!motivo) {
      showToast('Informe o motivo da negativa.');
      return;
    }

    const now = new Date().toISOString();
    const observacao = upsertObsMeta(card.observacaoGeral, {
      decisao: card.isFrota ? 'frota_negada' : 'negada',
      motivo_negativa: motivo,
      frota_status: card.isFrota ? 'negada' : '',
      frota_motivo_negativa: card.isFrota ? motivo : '',
      negado_em: now,
      frota_negado_em: card.isFrota ? now : '',
      decidido_por: usuarioDecisaoLabel(),
      frota_decidido_por: card.isFrota ? usuarioDecisaoLabel() : '',
    });

    setDenyTarget(null);
    setDenyMotivo('');
    void salvarAlteracoesLocais(card, card.itens, 'cancelada', 'Solicitação negada.', {
      finalizado_em: now,
      observacao,
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
                          {card.isFrota && card.devolucao !== '-' ? ` | Devolução: ${card.devolucao}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[0.72rem] font-extrabold uppercase tracking-wide ${STATUS_STYLE[card.status]}`}>
                          {STATUS_LABEL[card.status]}
                        </span>
                      </div>
                    </div>

                    {card.isFrota && (
                      <div className="mb-3 rounded-2xl border border-[rgba(92,155,255,0.28)] bg-[rgba(92,155,255,0.10)] px-4 py-3 text-sm text-[#d4e0ff]">
                        {card.frotaStatus === 'liberada'
                          ? 'Veículo liberado e enviado ao calendário.'
                          : 'Aguardando resposta do almoxarifado para liberação do veículo.'}
                      </div>
                    )}

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
                                {item.usoFrotaLabel && (
                                  <div className="mt-1 text-[11px] font-bold text-[#8dffca]">
                                    Uso: {item.usoFrotaLabel}
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
                          {card.isFrota
                            ? 'Pedido de frota: liberação/negativa define o próximo passo.'
                            : requestNeedsPhotos(card).length === 0
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
                          onClick={() => (card.isFrota ? handleLiberarFrota(card) : handleIniciarSeparacao(card))}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(92,155,255,0.5)] bg-[rgba(92,155,255,0.18)] px-4 py-2 text-sm font-bold text-[#b8d3ff] disabled:opacity-50"
                        >
                          {card.isFrota ? <CheckCircle2 size={14} /> : <Play size={14} />}
                          {card.isFrota ? 'Liberar veículo' : 'Iniciar separação'}
                        </button>
                      )}
                      {card.status === 'pendente' && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => abrirNegativa(card)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(255,122,157,0.45)] bg-[rgba(255,122,157,0.12)] px-4 py-2 text-sm font-bold text-[#ffd9e3] disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Negar solicitação
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
                      {card.status === 'aprovada' && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleDarBaixa(card)}
                          className="inline-flex items-center rounded-xl border border-[rgba(54,196,133,0.35)] bg-[rgba(54,196,133,0.15)] px-4 py-2 text-sm font-bold text-[#8dffca] disabled:opacity-50"
                        >
                          Concluir requisição
                        </button>
                      )}
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

      {denyTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(255,122,157,0.35)] bg-[linear-gradient(180deg,rgba(24,55,120,0.98),rgba(13,31,76,0.98))] p-5 shadow-2xl">
            <h3 className="m-0 text-xl font-black">Negar solicitação</h3>
            <p className="mt-2 text-sm text-[#cbd6ff]">
              Informe o motivo. Esse texto aparecerá para o solicitante na fila.
            </p>
            <textarea
              className="mt-4 min-h-[120px] w-full rounded-2xl border border-[rgba(255,122,157,0.35)] bg-[rgba(10,30,77,0.55)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9db2e7]"
              placeholder="Motivo da negativa *"
              value={denyMotivo}
              onChange={(e) => setDenyMotivo(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDenyTarget(null);
                  setDenyMotivo('');
                }}
                className="rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.45)] px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarNegativa}
                className="rounded-xl border border-[rgba(255,122,157,0.45)] bg-[rgba(255,122,157,0.15)] px-4 py-2 text-sm font-bold text-[#ffd9e3]"
              >
                Confirmar negativa
              </button>
            </div>
          </div>
        </div>
      )}

      {freteTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(113,210,255,0.35)] bg-[linear-gradient(180deg,rgba(24,55,120,0.98),rgba(13,31,76,0.98))] p-5 shadow-2xl">
            <h3 className="m-0 text-xl font-black">Liberar veículo</h3>
            <p className="mt-2 text-sm text-[#cbd6ff]">
              Informe quem fará o transporte. O solicitante verá esses dados no rastreio.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-[#9db2e7]">Tipo de frete</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFreteTipo('biasi')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold border transition ${
                    freteTipo === 'biasi'
                      ? 'border-[rgba(113,210,255,0.6)] bg-[rgba(113,210,255,0.18)] text-white'
                      : 'border-[rgba(113,154,255,0.25)] bg-[rgba(10,30,77,0.45)] text-[#cbd6ff]'
                  }`}
                >
                  Frota Biasi
                </button>
                <button
                  type="button"
                  onClick={() => setFreteTipo('terceiro')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold border transition ${
                    freteTipo === 'terceiro'
                      ? 'border-[rgba(113,210,255,0.6)] bg-[rgba(113,210,255,0.18)] text-white'
                      : 'border-[rgba(113,154,255,0.25)] bg-[rgba(10,30,77,0.45)] text-[#cbd6ff]'
                  }`}
                >
                  Frete terceirizado
                </button>
              </div>
            </div>

            {freteTipo === 'terceiro' && (
              <div className="mt-4 grid gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-[#9db2e7]">Empresa / motorista *</label>
                  <input
                    type="text"
                    className="rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.55)] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#9db2e7]"
                    placeholder="Nome da transportadora ou motorista"
                    value={freteTerceiroNome}
                    onChange={(e) => setFreteTerceiroNome(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-[0.18em] text-[#9db2e7]">Contato (telefone/WhatsApp)</label>
                  <input
                    type="text"
                    className="rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.55)] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#9db2e7]"
                    placeholder="(11) 99999-9999 (opcional)"
                    value={freteTerceiroContato}
                    onChange={(e) => setFreteTerceiroContato(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFreteTarget(null);
                  setFreteTerceiroNome('');
                  setFreteTerceiroContato('');
                }}
                className="rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.45)] px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarLiberarFrota}
                className="rounded-xl border border-[rgba(113,210,255,0.45)] bg-[rgba(113,210,255,0.18)] px-4 py-2 text-sm font-bold text-white"
              >
                Confirmar liberação
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,31,78,0.95)] px-4 py-2.5 text-sm font-bold shadow-2xl z-[120]">
          {toast}
        </div>
      )}
    </div>
  );
}
