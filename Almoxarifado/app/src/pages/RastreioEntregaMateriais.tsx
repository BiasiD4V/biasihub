import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Camera, Loader2, RefreshCw } from 'lucide-react';
import type { Requisicao, StatusRequisicao } from '../domain/entities/Requisicao';
import { supabase } from '../infrastructure/supabase/client';
import { CameraModal } from '../components/CameraModal';
import { useAuth } from '../context/AuthContext';

type FaseRastreio = 0 | 1 | 2 | 3;
type JsonMap = Record<string, unknown>;
type RequisicaoComJoin = Requisicao & { solicitante?: { nome: string } | null };

interface ItemRastreio {
  id: string;
  descricao: string;
  quantidadeLabel: string;
  choice: 'ok' | 'no';
  fotosFase: Record<string, string>; // { "0": url, "1": url, ... }
  fotosSolicitante: string[]; // fotos tiradas no Vercel
  observacaoItem: string;
  faseRastreio: FaseRastreio;
  raw: JsonMap;
}

interface AnexoGeral {
  url: string;
  tipo: 'audio' | 'video' | 'imagem' | 'doc';
  nome: string;
}

interface PedidoEntrega {
  id: string;
  numero: string; // últimos 6 chars do id
  obra: string;
  resumoItem: string;
  quantidade: string;
  tipo: string;
  solicitante: string;
  cargo: string;
  telefone: string;
  data: string;
  prazo: string;
  devolucao: string;
  anexos: number;
  fase: FaseRastreio;
  status: StatusRequisicao;
  criadoEm: string;
  observacao: string;
  observacaoOriginal: string;
  responsavelSeparacao: string;
  motorista: string;
  recebedor: string;
  freteTipo: string;             // 'biasi' | 'terceiro' | 'proprio' | 'outro' | ''
  freteTerceiroNome: string;
  freteTerceiroContato: string;
  freteOutroDescricao: string;
  entreguePor: string;
  entregueEm: string;
  recebidoPorNome: string;
  recebidoEm: string;
  entregaSolicitada: boolean;
  isFrota: boolean;
  confirmandoBaixa: boolean;
  detalhesAbertos: boolean;
  anexosGerais: AnexoGeral[];
  itens: ItemRastreio[];
}

const STORAGE_BUCKET = 'requisicoes';
const FASES_SEM_ENTREGA = ['Separando', 'Separado', 'Finalizado', 'Recebido'] as const;
const FASES_COM_ENTREGA = ['Separando', 'Separado', 'A caminho', 'Recebido'] as const;
// Apenas fase 1 (Separado) exige foto — as demais são opcionais
const FASE_INDICES: FaseRastreio[] = [1];

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

function upsertObsMeta(rawObservacao: string, updates: Record<string, string>): string {
  const parts = String(rawObservacao || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const nextParts = parts.filter((part) => {
    const key = part.slice(0, part.indexOf(':')).trim().toLowerCase();
    return !Object.prototype.hasOwnProperty.call(updates, key);
  });

  for (const [key, value] of Object.entries(updates)) {
    const cleanValue = String(value || '').trim();
    if (cleanValue) nextParts.push(`${key}:${cleanValue}`);
  }

  return nextParts.join(' | ');
}

function metaSim(value: string | undefined): boolean {
  return ['sim', 's', 'true', '1', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function fasesDoPedido(pedido: Pick<PedidoEntrega, 'entregaSolicitada'>) {
  return pedido.entregaSolicitada ? FASES_COM_ENTREGA : FASES_SEM_ENTREGA;
}

function nomeFase(pedido: Pick<PedidoEntrega, 'entregaSolicitada'>, fase: FaseRastreio) {
  return fasesDoPedido(pedido)[fase];
}

function faseFallback(status: StatusRequisicao): FaseRastreio {
  if (status === 'entregue') return 3;
  if (status === 'aprovada') return 0;
  return 0;
}

function clampFase(value: unknown, fallback: FaseRastreio): FaseRastreio {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    if (parsed <= 0) return 0;
    if (parsed >= 3) return 3;
    return parsed as FaseRastreio;
  }
  return fallback;
}

function parseItems(rawItems: unknown, status: StatusRequisicao): ItemRastreio[] {
  const list = Array.isArray(rawItems) ? rawItems : [];
  const fallback = faseFallback(status);

  return list
    .filter((entry): entry is JsonMap => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry, idx) => {
      const descricao = normalizeDisplayText(String(entry.descricao ?? entry.nome ?? `Item ${idx + 1}`));
      const quantidade = entry.quantidade;
      const unidade = normalizeDisplayText(String(entry.unidade ?? ''));
      const quantidadeLabel = `${quantidade ?? '-'}${unidade ? ` ${unidade}` : ''}`.trim();

      // multi-foto: fotos_fase = { "0": url, "1": url, ... }
      const fotosFase: Record<string, string> = {};
      const rawFotosFase = entry.fotos_fase;
      if (rawFotosFase && typeof rawFotosFase === 'object' && !Array.isArray(rawFotosFase)) {
        for (const [k, v] of Object.entries(rawFotosFase as Record<string, unknown>)) {
          if (typeof v === 'string' && v) fotosFase[k] = v;
        }
      }
      // fallback legado: foto_material vira foto da fase 0
      const legacy = entry.foto_material ?? entry.photoData;
      if (typeof legacy === 'string' && legacy && !fotosFase['0']) {
        fotosFase['0'] = legacy;
      }

      const fotosArrRaw = Array.isArray(entry.fotos_urls) ? entry.fotos_urls : [];
      const fotosSolicitante = fotosArrRaw
        .map((v) => (typeof v === 'string' ? v : ''))
        .filter(Boolean);

      const obsItemRaw = entry.observacao ?? entry.obs ?? '';
      const observacaoItem = normalizeDisplayText(typeof obsItemRaw === 'string' ? obsItemRaw : '');

      return {
        id: String(entry.item_id ?? entry.id ?? `${idx}`),
        descricao,
        quantidadeLabel,
        choice: String(entry.choice_estoque ?? entry.choice ?? 'ok').toLowerCase() === 'no' ? 'no' : 'ok',
        fotosFase,
        fotosSolicitante,
        observacaoItem,
        faseRastreio: clampFase(entry.fase_rastreio, fallback),
        raw: entry,
      };
    });
}

function detectarTipoAnexo(url: string): AnexoGeral['tipo'] {
  const lower = url.toLowerCase().split('?')[0];
  if (/\.(mp3|m4a|ogg|wav|aac)$/.test(lower)) return 'audio';
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(lower)) return 'video';
  if (/\.(jpg|jpeg|png|gif|webp|bmp|heic)$/.test(lower)) return 'imagem';
  return 'doc';
}

function parseAnexosGerais(meta: Record<string, string>): AnexoGeral[] {
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

function statusByPhase(currentStatus: StatusRequisicao, fase: FaseRastreio): StatusRequisicao {
  if (currentStatus === 'cancelada') return 'pendente';
  if (fase < 0) return 'pendente';
  return 'aprovada';
}

function itensQueExigemFoto(pedido: PedidoEntrega): ItemRastreio[] {
  if (pedido.isFrota) return [];
  return pedido.itens.filter((item) => item.choice === 'ok');
}

function todasFotosDaFase(pedido: PedidoEntrega, fase: FaseRastreio): boolean {
  return itensQueExigemFoto(pedido).every((item) => Boolean(item.fotosFase[String(fase)]));
}

function todasFotosCompletas(pedido: PedidoEntrega): boolean {
  return itensQueExigemFoto(pedido).every((item) =>
    FASE_INDICES.every((f) => Boolean(item.fotosFase[String(f)]))
  );
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function uploadFotoFase(file: File, pedidoId: string, itemId: string, fase: FaseRastreio): Promise<string | null> {
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `rastreio/${pedidoId}/${itemId}-fase${fase}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (error) return null;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl || null;
  } catch {
    return null;
  }
}

function mapRowToPedido(row: RequisicaoComJoin & { telefone?: string | null; solicitante_nome?: string | null }): PedidoEntrega {
  const meta = parseObsMeta(row.observacao);
  const status = (row.status || 'pendente') as StatusRequisicao;
  const itens = parseItems(row.itens, status);
  const fase =
    status === 'entregue'
      ? 3
      : itens.reduce<FaseRastreio>((maxFase, item) => (item.faseRastreio > maxFase ? item.faseRastreio : maxFase), faseFallback(status));

  const primeiroItem = itens[0];
  const tipoRaw = normalizeDisplayText(String((primeiroItem?.raw.tipo as string | undefined) || 'Material')).toLowerCase();
  const isFrota = tipoRaw === 'carro' || itens.some((item) => Boolean(item.raw.placa || item.raw.modelo));
  const tipo = tipoRaw === 'ferramenta' ? 'Ferramenta' : tipoRaw === 'carro' ? 'Veículo' : 'Material';
  const resumoItem = itens.length <= 1 ? primeiroItem?.descricao || '-' : `${primeiroItem?.descricao || '-'} (+${itens.length - 1} itens)`;

  return {
    id: row.id,
    numero: row.id.replace(/-/g, '').slice(-6).toUpperCase(),
    obra: normalizeDisplayText(row.obra),
    resumoItem,
    quantidade: primeiroItem?.quantidadeLabel || '-',
    tipo,
    solicitante: normalizeDisplayText(row.solicitante?.nome || row.solicitante_nome || '-'),
    cargo: normalizeDisplayText(meta.cargo || '-'),
    telefone: normalizeDisplayText(row.telefone || meta.telefone || '-'),
    data: formatarData(row.data_solicitacao),
    prazo: normalizeDisplayText(meta.prazo || '-'),
    devolucao: normalizeDisplayText(meta.devolucao || '-'),
    anexos: Number(meta.anexos || 0),
    fase,
    status,
    criadoEm: row.criado_em,
    observacao: normalizeDisplayText(meta.obs || '-'),
    observacaoOriginal: row.observacao || '',
    responsavelSeparacao: normalizeDisplayText(meta.responsavel || '-'),
    motorista: normalizeDisplayText(meta.motorista || '-'),
    recebedor: normalizeDisplayText(meta.recebedor || '-'),
    freteTipo: normalizeDisplayText(meta.frete_tipo || ''),
    freteTerceiroNome: normalizeDisplayText(meta.frete_terceiro_nome || ''),
    freteTerceiroContato: normalizeDisplayText(meta.frete_terceiro_contato || ''),
    freteOutroDescricao: normalizeDisplayText(meta.frete_outro_descricao || ''),
    entreguePor: normalizeDisplayText(meta.entregue_por || ''),
    entregueEm: normalizeDisplayText(meta.entregue_em || ''),
    recebidoPorNome: normalizeDisplayText(meta.recebido_por_nome || ''),
    recebidoEm: normalizeDisplayText(meta.recebido_em || ''),
    entregaSolicitada: metaSim(meta.entrega || meta.entrega_solicitada),
    isFrota,
    confirmandoBaixa: false,
    detalhesAbertos: false,
    anexosGerais: parseAnexosGerais(meta),
    itens,
  };
}

function faseBadgeClass(fase: FaseRastreio): string {
  return `fase-${fase}`;
}

function applyItemMeta(item: ItemRastreio, fase: FaseRastreio): JsonMap {
  const ultimaFoto = item.fotosFase[String(fase)] || item.fotosFase['0'] || '';
  return {
    ...item.raw,
    fase_rastreio: fase,
    fotos_fase: item.fotosFase,
    fotos_urls: item.fotosSolicitante, // preserva fotos do Vercel
    foto_material: ultimaFoto, // compat
  };
}

export function RastreioEntregaMateriais() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [camTarget, setCamTarget] = useState<{ pedidoId: string; itemId: string; fase: FaseRastreio } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Modal de assinatura digital
  const [assinaturaPedido, setAssinaturaPedido] = useState<PedidoEntrega | null>(null);
  const [assinaturaRecebedor, setAssinaturaRecebedor] = useState('');
  const [assinaturaFeita, setAssinaturaFeita] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);

  const resumo = useMemo(() => {
    return {
      separando: pedidos.filter((p) => p.fase === 0).length,
      separado: pedidos.filter((p) => p.fase === 1).length,
      aCaminho: pedidos.filter((p) => p.fase === 2).length,
      entregue: pedidos.filter((p) => p.fase === 3).length,
    };
  }, [pedidos]);

  const filaAtiva = useMemo(
    () => [...pedidos].filter((pedido) => pedido.fase < 3).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)),
    [pedidos]
  );

  const filaIndexById = useMemo(() => {
    const map = new Map<string, number>();
    filaAtiva.forEach((pedido, index) => map.set(pedido.id, index));
    return map;
  }, [filaAtiva]);

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

  async function carregarPedidos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('requisicoes_almoxarifado')
        .select('*, telefone, solicitante_nome, solicitante:usuarios!requisicoes_almoxarifado_solicitante_id_fkey(nome)')
        .eq('status', 'aprovada')
        .order('criado_em', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as (RequisicaoComJoin & { telefone?: string | null; solicitante_nome?: string | null })[];
      setPedidos(rows.map(mapRowToPedido).filter((pedido) => !pedido.isFrota));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível carregar o rastreio.';
      showToast(msg);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarPedidos();
  }, []);

  // Realtime — rastreio atualiza quando status/itens mudam
  useEffect(() => {
    const ch = supabase
      .channel('rastreio-entrega')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requisicoes_almoxarifado' },
        () => {
          void carregarPedidos();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  function updatePedidoState(id: string, updater: (pedido: PedidoEntrega) => PedidoEntrega) {
    setPedidos((prev) => prev.map((pedido) => (pedido.id === id ? updater(pedido) : pedido)));
  }

  async function persistFase(pedido: PedidoEntrega, fase: FaseRastreio, status: StatusRequisicao) {
    setSavingId(pedido.id);
    const itensPayload = pedido.itens.map((item) => applyItemMeta(item, fase));
    const { error } = await supabase.from('requisicoes_almoxarifado').update({ itens: itensPayload, status }).eq('id', pedido.id);
    if (error) throw error;
    setSavingId(null);
  }

  async function atualizarFase(pedido: PedidoEntrega, fase: FaseRastreio, successMessage?: string) {
    const nextStatus = statusByPhase(pedido.status, fase);

    updatePedidoState(pedido.id, (current) => ({
      ...current,
      fase,
      status: nextStatus,
      confirmandoBaixa: false,
      itens: current.itens.map((item) => ({ ...item, faseRastreio: fase })),
    }));

    try {
      await persistFase(pedido, fase, nextStatus);
      if (successMessage) showToast(successMessage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível atualizar a fase.';
      showToast(msg);
      await carregarPedidos();
    } finally {
      setSavingId(null);
    }
  }

  function toggleDetalhes(id: string) {
    updatePedidoState(id, (pedido) => ({ ...pedido, detalhesAbertos: !pedido.detalhesAbertos }));
  }

  function avancarFase(pedido: PedidoEntrega) {
    if (pedido.fase >= 3) return;
    const exigeFotoNestaFase = FASE_INDICES.includes(pedido.fase);
    if (exigeFotoNestaFase && !todasFotosDaFase(pedido, pedido.fase)) {
      showToast(`Faltam fotos da fase "${nomeFase(pedido, pedido.fase)}". Tire uma foto para cada item antes de avançar.`);
      return;
    }
    const next = (pedido.fase + 1) as FaseRastreio;
    void atualizarFase(pedido, next, 'Fase avançada.');
  }

  function regredirFase(pedido: PedidoEntrega) {
    if (pedido.fase <= 0) return;
    const next = (pedido.fase - 1) as FaseRastreio;
    void atualizarFase(pedido, next, 'Fase regredida.');
  }

  async function concluirBaixa(pedido: PedidoEntrega, recebedorNome?: string, assinaturaDataUrl?: string) {
    setSavingId(pedido.id);

    try {
      const itensPayload = pedido.itens.map((item) => applyItemMeta(item, 3));
      // Upload assinatura se disponível
      let assinaturaUrl = '';
      if (assinaturaDataUrl && assinaturaDataUrl.startsWith('data:image')) {
        try {
          const res = await fetch(assinaturaDataUrl);
          const blob = await res.blob();
          const path = `assinaturas/${pedido.id}_${Date.now()}.png`;
          const { data: up } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: 'image/png', upsert: true });
          if (up) {
            const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
            assinaturaUrl = pub.publicUrl;
          }
        } catch { /* ignora erro de upload de assinatura */ }
      }
      const obsAtualizada = upsertObsMeta(pedido.observacaoOriginal || `obs:${pedido.observacao}`, {
        recebedor: recebedorNome || '',
        recebido_por_nome: recebedorNome || '',
        recebido_em: new Date().toISOString(),
        assinatura_url: assinaturaUrl,
      });
      const { error } = await supabase
        .from('requisicoes_almoxarifado')
        .update({ itens: itensPayload, status: 'entregue', observacao: obsAtualizada })
        .eq('id', pedido.id);

      if (error) throw error;
      await registrarMovimentacoesSaida(pedido);
      // Após sucesso, realtime/reload tira da lista
      setPedidos((prev) => prev.filter((item) => item.id !== pedido.id));
      showToast('Baixa final concluída.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível concluir a baixa.';
      showToast(msg);
      await carregarPedidos();
    } finally {
      setSavingId(null);
    }
  }

  async function registrarMovimentacoesSaida(pedido: PedidoEntrega) {
    if (pedido.isFrota) return;
    if (!usuario?.id) {
      showToast('Baixa concluída, mas usuário não identificado para registrar movimentação.');
      return;
    }

    const rows = pedido.itens
      .filter((item) => item.choice === 'ok' && item.raw.item_id)
      .map((item) => ({
        item_id: String(item.raw.item_id),
        tipo: 'saida',
        quantidade: Number(item.raw.quantidade ?? 0) || 1,
        obra: pedido.obra,
        observacao: `Saída vinculada ao rastreio da requisição ${pedido.id}`,
        data: new Date().toISOString().slice(0, 10),
        responsavel_id: usuario.id,
      }));

    if (rows.length === 0) return;
    const { error } = await supabase.from('movimentacoes_almoxarifado').insert(rows);
    if (error) {
      console.warn('[RastreioEntregaMateriais] falha ao registrar movimentações:', error.message);
      showToast(`Baixa concluída, mas a movimentação não foi registrada: ${error.message}`);
    }
  }

  async function registrarFotoFase(pedido: PedidoEntrega, itemId: string, fase: FaseRastreio, file: File) {
    setSavingId(pedido.id);
    showToast(`Enviando foto da fase ${nomeFase(pedido, fase)}...`);
    try {
      let ref = await uploadFotoFase(file, pedido.id, itemId, fase);
      if (!ref) {
        // fallback: base64 embutido
        try {
          ref = await fileToDataUrl(file);
        } catch {
          ref = '';
        }
      }
      if (!ref) throw new Error('Não foi possível processar a foto.');

      const nextItems = pedido.itens.map((item) =>
        item.id === itemId
          ? { ...item, fotosFase: { ...item.fotosFase, [String(fase)]: ref as string } }
          : item
      );
      updatePedidoState(pedido.id, (current) => ({ ...current, itens: nextItems }));

      const itensPayload = nextItems.map((item) => applyItemMeta(item, pedido.fase));
      const { error } = await supabase.from('requisicoes_almoxarifado').update({ itens: itensPayload }).eq('id', pedido.id);
      if (error) throw error;

      showToast(`Foto da fase "${nomeFase(pedido, fase)}" registrada.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível registrar a foto.';
      showToast(msg);
      await carregarPedidos();
    } finally {
      setSavingId(null);
    }
  }

  function darBaixa(pedido: PedidoEntrega) {
    if (pedido.fase !== 3) return;
    if (!todasFotosCompletas(pedido)) {
      showToast('Faltam fotos da fase "Separado". Tire uma foto de cada item antes de concluir.');
      return;
    }
    // Abre modal de assinatura digital
    setAssinaturaRecebedor('');
    setAssinaturaFeita(false);
    setAssinaturaPedido(pedido);
    setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0d2050';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }, 100);
  }

  function limparCanvas() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0d2050';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setAssinaturaFeita(false);
  }

  function pontoCanvas(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function iniciarAssinatura(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ponto = pontoCanvas(event);
    if (!canvas || !ponto) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setPointerCapture(event.pointerId);
    desenhando.current = true;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ponto.x, ponto.y);
  }

  function moverAssinatura(event: PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ponto = pontoCanvas(event);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ponto || !ctx) return;
    ctx.lineTo(ponto.x, ponto.y);
    ctx.stroke();
    setAssinaturaFeita(true);
  }

  function pararAssinatura() {
    desenhando.current = false;
  }

  function confirmarAssinatura() {
    if (!assinaturaPedido) return;
    if (!assinaturaRecebedor.trim()) {
      showToast('Informe o nome de quem recebeu.');
      return;
    }
    if (!assinaturaFeita) {
      showToast('Colete a assinatura digital antes de finalizar.');
      return;
    }
    const assinaturaDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
    setAssinaturaPedido(null);
    void concluirBaixa(assinaturaPedido, assinaturaRecebedor, assinaturaDataUrl);
  }

  return (
    <div className="rt-page">
      <style>{`
        .rt-page, .rt-page * { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
        .rt-page { background: #0a255c; color: #ffffff; padding: 28px; min-height: 100%; }
        .rt-container { max-width: 1240px; margin: 0 auto; }
        .rt-topo { margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
        .rt-topo h1 { font-size: 34px; font-weight: 800; margin: 0 0 8px; }
        .rt-topo p { color: #b8c8f7; font-size: 15px; margin: 0; }
        .rt-refresh { border: 1px solid rgba(120,160,255,0.35); background: rgba(17,47,115,0.72); color:#fff; padding:10px 14px; border-radius:12px; font-weight:700; display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
        .rt-resumo { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin: 22px 0 28px; }
        .rt-resumo-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(120,160,255,0.25); border-radius: 18px; padding: 16px 18px; }
        .rt-resumo-card span { display:block; color:#b8c8f7; font-size:13px; margin-bottom:6px; }
        .rt-resumo-card strong { font-size:24px; font-weight:800; }
        .rt-lista { display:flex; flex-direction:column; gap:16px; }
        .rt-pedido { background:#112f73; border:1px solid rgba(120,160,255,0.28); border-radius:22px; padding:20px; }
        .rt-pedido-topo { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:14px; }
        .rt-pedido-info h2 { font-size:32px; font-weight:800; margin:0 0 8px; }
        .rt-pedido-info .item { color:#dbe7ff; font-size:20px; margin-bottom:10px; }
        .rt-meta { color:#b8c8f7; line-height:1.65; font-size:16px; }
        .rt-numero { display:inline-block; margin-right:8px; padding:2px 10px; border-radius:999px; background:rgba(120,160,255,0.18); border:1px solid rgba(120,160,255,0.4); color:#dbe7ff; font-weight:800; font-size:13px; letter-spacing:1px; }
        .rt-badge-fase { min-width:170px; text-align:center; font-weight:800; font-size:15px; padding:14px 18px; border-radius:999px; border:1px solid; white-space:nowrap; }
        .fase-0 { background: rgba(255,173,51,0.12); color:#ffd08a; border-color: rgba(255,173,51,0.55); }
        .fase-1 { background: rgba(61,182,255,0.12); color:#94dcff; border-color: rgba(61,182,255,0.55); }
        .fase-2 { background: rgba(117,239,136,0.12); color:#a7ffb1; border-color: rgba(117,239,136,0.45); }
        .fase-3 { background: rgba(120,255,178,0.12); color:#9ff7c9; border-color: rgba(120,255,178,0.5); }
        .rt-fila { margin:16px 0 18px; display:flex; flex-wrap:wrap; gap:12px; }
        .rt-fila-box { background: rgba(255,255,255,0.05); border: 1px solid rgba(120,160,255,0.2); border-radius:14px; padding:12px 14px; color:#dce6ff; font-size:15px; }
        .rt-tracker { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin:16px 0 18px; }
        .rt-etapa { background: rgba(255,255,255,0.04); border: 1px solid rgba(120,160,255,0.2); border-radius:16px; padding:14px 10px; text-align:center; color:#9fb5ef; font-weight:700; font-size:14px; }
        .rt-etapa.completed { background: rgba(117,239,136,0.12); border-color: rgba(117,239,136,0.45); color:#a7ffb1; }
        .rt-etapa.active { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.3); color:#fff; }
        .rt-fotos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 12px; }
        .rt-fotos-card { border: 1px solid rgba(120,160,255,0.25); background: rgba(10,30,77,0.35); border-radius: 14px; padding: 10px; }
        .rt-fotos-card.active { border-color: rgba(255,255,255,0.4); background: rgba(20,50,120,0.55); }
        .rt-fotos-card.done { border-color: rgba(117,239,136,0.4); background: rgba(60,130,90,0.18); }
        .rt-fotos-card h4 { margin:0 0 6px; font-size:13px; color:#b8c8f7; text-transform:uppercase; letter-spacing:0.5px; font-weight:800; }
        .rt-fotos-thumbs { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
        .rt-fotos-thumb { width:56px; height:56px; border-radius:8px; overflow:hidden; border:1px solid rgba(120,160,255,0.3); background:#06183f; display:flex; align-items:center; justify-content:center; font-size:10px; color:#8aa3e2; }
        .rt-fotos-thumb img { width:100%; height:100%; object-fit:cover; }
        .rt-btn-foto { display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(120,160,255,0.4); background:#173a87; color:#fff; padding:8px 12px; border-radius:10px; font-weight:800; font-size:12px; cursor:pointer; }
        .rt-btn-foto:hover { background:#1f56c0; }
        .rt-btn-foto:disabled { opacity:0.5; cursor:not-allowed; }
        .rt-acoes { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
        .rt-btn { border: 1px solid rgba(120,160,255,0.35); background:#173a87; color:#fff; padding:12px 18px; border-radius:16px; font-weight:800; font-size:15px; cursor:pointer; transition:0.2s ease; }
        .rt-btn:hover { background:#20479f; }
        .rt-btn:disabled { opacity:0.5; cursor:not-allowed; background:#294b95; }
        .rt-detalhes { margin-top:16px; padding-top:16px; border-top:1px solid rgba(120,160,255,0.2); color:#dbe7ff; line-height:1.7; }
        .rt-item-nome { font-size:14px; font-weight:800; color:#f4f7ff; }
        .rt-item-card { margin-bottom:10px; border:1px solid rgba(120,160,255,0.2); border-radius:12px; padding:10px 12px; background: rgba(10,30,77,0.28); }
        .rt-empty, .rt-loading { border: 1px dashed rgba(120,160,255,0.28); border-radius:18px; padding:24px; text-align:center; color:#b8c8f7; background: rgba(255,255,255,0.03); }
        .rt-toast { position:fixed; right:18px; bottom:18px; border:1px solid rgba(120,160,255,0.35); background: rgba(10,31,78,0.95); border-radius:12px; padding:10px 14px; font-weight:700; z-index:120; }
        .rt-modal-backdrop { position: fixed; inset: 0; z-index: 110; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(0,0,0,0.68); }
        .rt-modal { width: min(720px, 100%); border: 1px solid rgba(255,200,45,0.38); border-radius: 22px; background: #102f73; box-shadow: 0 24px 70px rgba(0,0,0,0.45); padding: 18px; }
        .rt-modal h3 { margin: 0 0 6px; font-size: 22px; }
        .rt-modal p { margin: 0 0 14px; color: #cbd8ff; font-size: 14px; }
        .rt-assinatura-input { width: 100%; min-height: 46px; border-radius: 14px; border: 1px solid rgba(120,160,255,0.35); background: #0d2050; color: #fff; padding: 0 14px; outline: none; margin-bottom: 12px; }
        .rt-assinatura-canvas { width: 100%; height: 220px; border-radius: 16px; border: 1px dashed rgba(255,200,45,0.45); background: #0d2050; touch-action: none; display: block; }
        .rt-modal-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; margin-top: 14px; }
        @media (max-width: 768px) {
          .rt-page { padding: 16px; }
          .rt-pedido-topo { flex-direction: column; }
          .rt-pedido-info h2 { font-size: 24px; }
          .rt-tracker { grid-template-columns: 1fr 1fr; }
          .rt-badge-fase { width: 100%; }
        }
      `}</style>

      <div className="rt-container">
        <div className="rt-topo">
          <div>
            <h1>Rastreio de entrega de materiais</h1>
            <p>Tire a foto na fase <strong>Separado</strong>. Na entrega, colete a assinatura digital do recebedor.</p>
          </div>
          <button type="button" className="rt-refresh" onClick={() => void carregarPedidos()}>
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>

        <div className="rt-resumo">
          <div className="rt-resumo-card"><span>Separando</span><strong>{resumo.separando}</strong></div>
          <div className="rt-resumo-card"><span>Separado</span><strong>{resumo.separado}</strong></div>
          <div className="rt-resumo-card"><span>Finalizado / A caminho</span><strong>{resumo.aCaminho}</strong></div>
          <div className="rt-resumo-card"><span>Recebido</span><strong>{resumo.entregue}</strong></div>
        </div>

        {loading ? (
          <div className="rt-loading">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} className="animate-spin" /> Carregando pedidos...
            </span>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="rt-empty">Nenhum pedido encontrado para rastreio.</div>
        ) : (
          <div className="rt-lista">
            {pedidos.map((pedido) => {
              const fasesPedido = fasesDoPedido(pedido);
              const filaIndex = filaIndexById.get(pedido.id);
              const naFrente = pedido.fase === 3 ? 0 : filaIndex ?? 0;
              const posicao = pedido.fase === 3 ? 'Concluído' : naFrente + 1;
              const itensObrig = itensQueExigemFoto(pedido);
              const exigeFotoNestaFase = FASE_INDICES.includes(pedido.fase);
              const faseCompleta = !exigeFotoNestaFase || todasFotosDaFase(pedido, pedido.fase);
              const tudoCompleto = todasFotosCompletas(pedido);
              const fotosRegistradas = itensObrig.reduce((acc, it) => acc + FASE_INDICES.filter((f) => Boolean(it.fotosFase[String(f)])).length, 0);
              const fotosObrigatorias = itensObrig.length * FASE_INDICES.length;
              const textoBotaoBaixa = pedido.fase !== 3 ? 'Baixa indisponível' : 'Assinar e dar baixa';

              return (
                <div className="rt-pedido" key={pedido.id}>
                  <div className="rt-pedido-topo">
                    <div className="rt-pedido-info">
                      <h2>{pedido.obra}</h2>
                      <div className="item">
                        <span className="rt-numero">#{pedido.numero}</span>
                        {pedido.resumoItem} - {pedido.quantidade}
                      </div>
                      <div className="rt-meta">
                        Tipo: {pedido.tipo} | Solicitante: {pedido.solicitante} | Cargo: {pedido.cargo} | Tel: {pedido.telefone}
                        <br />
                        Data: {pedido.data} | Prazo: {pedido.prazo} | Entrega: {pedido.entregaSolicitada ? 'Sim' : 'Não'} | Anexos: {pedido.anexos}
                      </div>
                    </div>

                    <div className={`rt-badge-fase ${faseBadgeClass(pedido.fase)}`}>{nomeFase(pedido, pedido.fase).toUpperCase()}</div>
                  </div>

                  <div className="rt-fila">
                    <div className="rt-fila-box"><strong>Nº Pedido:</strong> #{pedido.numero}</div>
                    <div className="rt-fila-box"><strong>Pedidos na frente:</strong> {naFrente}</div>
                    <div className="rt-fila-box"><strong>Sua posição:</strong> {posicao}</div>
                    <div className="rt-fila-box"><strong>Fotos obrigatórias:</strong> {itensObrig.length === 0 ? 'não obrigatórias' : `${fotosRegistradas}/${fotosObrigatorias}`}</div>
                  </div>

                  <div className="rt-tracker">
                    {fasesPedido.map((faseNome, faseIndex) => {
                      let classe = '';
                      if (faseIndex < pedido.fase) classe = 'completed';
                      if (faseIndex === pedido.fase) classe = 'active';
                      return (
                        <div className={`rt-etapa ${classe}`} key={`${pedido.id}-${faseNome}`}>
                          {faseIndex + 1}. {faseNome}
                        </div>
                      );
                    })}
                  </div>

                  {/* Anexos gerais do solicitante (áudios, vídeos, docs) */}
                  {pedido.anexosGerais.length > 0 && (
                    <div style={{ marginBottom: 14, padding: 12, border: '1px solid rgba(120,160,255,0.25)', borderRadius: 14, background: 'rgba(10,30,77,0.28)' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#dce6ff', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                        Anexos do solicitante ({pedido.anexosGerais.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {pedido.anexosGerais.map((anexo, i) => (
                          <div key={`${pedido.id}-anexo-${i}`} style={{ border: '1px solid rgba(120,160,255,0.3)', background: 'rgba(10,30,77,0.45)', borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {anexo.tipo === 'audio' && <audio controls src={anexo.url} style={{ maxWidth: 260 }} />}
                            {anexo.tipo === 'video' && <video controls src={anexo.url} style={{ maxWidth: 260, maxHeight: 180 }} />}
                            {anexo.tipo === 'imagem' && (
                              <a href={anexo.url} target="_blank" rel="noreferrer">
                                <img src={anexo.url} alt={anexo.nome} style={{ maxWidth: 140, maxHeight: 140, objectFit: 'cover', borderRadius: 6 }} />
                              </a>
                            )}
                            {anexo.tipo === 'doc' && (
                              <a href={anexo.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#89b6ff', textDecoration: 'underline' }}>
                                {anexo.nome || 'Arquivo'}
                              </a>
                            )}
                            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: '#9db2e7' }}>{anexo.tipo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fotos do solicitante por item (Vercel) */}
                  {pedido.itens.some((it) => it.fotosSolicitante.length > 0 || it.observacaoItem) && (
                    <div style={{ marginBottom: 14, padding: 12, border: '1px solid rgba(120,160,255,0.25)', borderRadius: 14, background: 'rgba(10,30,77,0.28)' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#dce6ff', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                        Fotos / observações do solicitante
                      </div>
                      {pedido.itens.map((item) => {
                        if (item.fotosSolicitante.length === 0 && !item.observacaoItem) return null;
                        return (
                          <div key={`${pedido.id}-sol-${item.id}`} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f7ff', marginBottom: 4 }}>
                              {item.descricao}
                            </div>
                            {item.observacaoItem && (
                              <div style={{ fontSize: 12, fontStyle: 'italic', color: '#cbd6ff', marginBottom: 6 }}>
                                &ldquo;{item.observacaoItem}&rdquo;
                              </div>
                            )}
                            {item.fotosSolicitante.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {item.fotosSolicitante.map((url, i) => (
                                  <a key={`${item.id}-sol-${i}`} href={url} target="_blank" rel="noreferrer"
                                     style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(120,160,255,0.35)', background: '#06183f', display: 'block' }}>
                                    <img src={url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Grid por item, mostrando 4 quadrados (um por fase) */}
                  {itensObrig.length > 0 && (
                    <div>
                      {itensObrig.map((item) => (
                        <div key={item.id} className="rt-item-card">
                          <div className="rt-item-nome">{item.descricao} — {item.quantidadeLabel}</div>
                          <div className="rt-fotos-grid" style={{ marginTop: 8 }}>
                            {FASE_INDICES.map((faseIdx) => {
                              const url = item.fotosFase[String(faseIdx)];
                              const isActive = faseIdx === pedido.fase;
                              const isDone = Boolean(url);
                              const cls = isDone ? 'done' : isActive ? 'active' : '';
                              return (
                                <div key={`${item.id}-f${faseIdx}`} className={`rt-fotos-card ${cls}`}>
                                  <h4>Fase {faseIdx + 1}: {nomeFase(pedido, faseIdx)}</h4>
                                  {url ? (
                                    <div style={{ width:'100%', height:120, borderRadius:8, overflow:'hidden', background:'#06183f' }}>
                                      <img src={url} alt={nomeFase(pedido, faseIdx)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                    </div>
                                  ) : (
                                    <div style={{ width:'100%', height:120, borderRadius:8, border:'1px dashed rgba(120,160,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#8aa3e2', fontSize:12 }}>
                                      Sem foto
                                    </div>
                                  )}
                                  <div style={{ marginTop: 8, display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                                    <span style={{ fontSize:11, color: isDone ? '#a7ffb1' : '#ffca57', fontWeight:700 }}>
                                      {isDone ? '✓ registrada' : 'pendente'}
                                    </span>
                                    <button
                                      type="button"
                                      className="rt-btn-foto"
                                      disabled={savingId === pedido.id}
                                      onClick={() => setCamTarget({ pedidoId: pedido.id, itemId: item.id, fase: faseIdx })}
                                    >
                                      <Camera size={13} />
                                      {isDone ? 'Refazer' : 'Tirar foto'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rt-acoes">
                    <button className="rt-btn" onClick={() => toggleDetalhes(pedido.id)} type="button">
                      {pedido.detalhesAbertos ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                    <button
                      className="rt-btn"
                      onClick={() => regredirFase(pedido)}
                      disabled={savingId === pedido.id || pedido.fase <= 0}
                      type="button"
                    >
                      Regredir fase
                    </button>
                    <button
                      className="rt-btn"
                      onClick={() => avancarFase(pedido)}
                      disabled={savingId === pedido.id || pedido.fase >= 3 || !faseCompleta}
                      type="button"
                      title={!faseCompleta ? 'Tire a foto da fase "Separado" de todos os itens antes de avançar' : undefined}
                    >
                      Avançar fase
                    </button>
                    <button
                      className="rt-btn"
                      onClick={() => darBaixa(pedido)}
                      disabled={savingId === pedido.id || pedido.fase !== 3 || !tudoCompleto}
                      type="button"
                    >
                      {textoBotaoBaixa}
                    </button>
                  </div>

                  {/* Banner de frete: aparece sempre que tem informação,
                      independente dos detalhes estarem abertos. */}
                  {pedido.freteTipo && (
                    <div className="rt-frete-banner" style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(54,196,133,0.35)',
                      background: 'rgba(54,196,133,0.08)',
                      color: '#d4f5e2',
                      fontSize: '0.85rem',
                    }}>
                      <strong>🚚 Frete:</strong>{' '}
                      {pedido.freteTipo === 'terceiro'
                        ? `Terceirizado${pedido.freteTerceiroNome ? ` — ${pedido.freteTerceiroNome}` : ''}${pedido.freteTerceiroContato ? ` (${pedido.freteTerceiroContato})` : ''}`
                        : pedido.freteTipo === 'proprio'
                        ? '👤 Solicitante retira pessoalmente'
                        : pedido.freteTipo === 'outro'
                        ? `Outro${pedido.freteOutroDescricao ? ` — ${pedido.freteOutroDescricao}` : ''}`
                        : '🚛 Biasi Engenharia (frota interna)'}
                    </div>
                  )}

                  {pedido.detalhesAbertos && (
                    <div className="rt-detalhes">
                      <strong>Responsável pela separação:</strong> {pedido.responsavelSeparacao}<br />
                      <strong>Motorista:</strong> {pedido.motorista}<br />
                      <strong>Recebedor na obra:</strong> {pedido.recebedor}<br />
                      {pedido.entreguePor && (
                        <>
                          <strong>Entregue por:</strong> {pedido.entreguePor}
                          {pedido.entregueEm ? ` em ${pedido.entregueEm}` : ''}
                          <br />
                        </>
                      )}
                      {pedido.recebidoPorNome && (
                        <>
                          <strong>Recebido por:</strong> {pedido.recebidoPorNome}
                          {pedido.recebidoEm ? ` em ${pedido.recebidoEm}` : ''}
                          <br />
                        </>
                      )}
                      <strong>Observação:</strong> {pedido.observacao}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {camTarget && (
        <CameraModal
          mode="photo"
          onCapture={(file) => {
            const target = camTarget;
            setCamTarget(null);
            if (!target) return;
            const pedido = pedidos.find((p) => p.id === target.pedidoId);
            if (pedido) void registrarFotoFase(pedido, target.itemId, target.fase, file);
          }}
          onClose={() => setCamTarget(null)}
        />
      )}

      {assinaturaPedido && (
        <div className="rt-modal-backdrop">
          <div className="rt-modal">
            <h3>Assinatura digital da entrega</h3>
            <p>Informe quem recebeu e peça a assinatura antes de concluir a baixa do pedido #{assinaturaPedido.numero}.</p>
            <input
              className="rt-assinatura-input"
              value={assinaturaRecebedor}
              onChange={(event) => setAssinaturaRecebedor(event.target.value)}
              placeholder="Nome de quem recebeu"
            />
            <canvas
              ref={canvasRef}
              width={900}
              height={320}
              className="rt-assinatura-canvas"
              onPointerDown={iniciarAssinatura}
              onPointerMove={moverAssinatura}
              onPointerUp={pararAssinatura}
              onPointerCancel={pararAssinatura}
              onPointerLeave={pararAssinatura}
            />
            <div className="rt-modal-actions">
              <button type="button" className="rt-btn" onClick={limparCanvas}>Limpar assinatura</button>
              <button type="button" className="rt-btn" onClick={() => setAssinaturaPedido(null)}>Cancelar</button>
              <button type="button" className="rt-btn" onClick={confirmarAssinatura} disabled={savingId === assinaturaPedido.id}>
                Concluir baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="rt-toast">{toast}</div>}
    </div>
  );
}
