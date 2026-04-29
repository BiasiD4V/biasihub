import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Package, RefreshCw, RotateCcw, Truck, XCircle } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';

interface RequisicaoItem {
  item_id?: string;
  descricao?: string;
  nome?: string;
  quantidade?: number;
  unidade?: string;
  tipo?: string;
  placa?: string | null;
  modelo?: string | null;
  observacao?: string | null;
  uso_frota?: string | null;
  uso_frota_label?: string | null;
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
  if (statusRaw === 'pendente' || !statusRaw) return 'aguardando';

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
        if (
          [
            'prazo',
            'devolucao',
            'prioridade',
            'obs',
            'cargo',
            'entrega',
            'decisao',
            'motivo_negativa',
            'frota_status',
            'frota_motivo_negativa',
            'frota_liberado_em',
            'frota_negado_em',
            'cancelado_em',
            'cancelado_por',
            'motivo_cancelamento',
            'frete_tipo',
            'frete_terceiro_nome',
            'frete_terceiro_contato',
            'recebido_por_nome',
            'recebido_em',
            'entregue_por',
            'entregue_em',
            'prolongacao_pedida',
            'prolongacao_motivo',
            'prolongacao_aprovada',
            'prolongacao_em',
            'origem_modulo',
            'origem_area',
            'origem_contexto',
            'resposta_almox',
            'resposta_almox_por',
            'resposta_almox_em',
          ].includes(chave)
        ) {
          meta[chave] = valor;
          return;
        }
      }
      textos.push(parte);
    });

  return {
    cargo: meta.cargo,
    prazo: formatPrazo(meta.prazo),
    devolucao: formatPrazo(meta.devolucao),
    prioridade: meta.prioridade,
    entregaSolicitada: ['sim', 's', 'true', '1', 'yes'].includes(String(meta.entrega || '').trim().toLowerCase()),
    decisao: meta.decisao,
    frotaStatus: meta.frota_status,
    motivoNegativa: meta.motivo_negativa || meta.frota_motivo_negativa,
    canceladoEm: formatPrazo(meta.cancelado_em),
    canceladoPor: meta.cancelado_por,
    motivoCancelamento: meta.motivo_cancelamento,
    freteTipo: meta.frete_tipo,
    freteTerceiroNome: meta.frete_terceiro_nome,
    freteTerceiroContato: meta.frete_terceiro_contato,
    recebidoPorNome: meta.recebido_por_nome,
    recebidoEm: formatPrazo(meta.recebido_em),
    entreguePor: meta.entregue_por,
    entregueEm: formatPrazo(meta.entregue_em),
    prolongacaoPedida: meta.prolongacao_pedida, // ISO string
    prolongacaoPedidaFmt: formatPrazo(meta.prolongacao_pedida),
    prolongacaoMotivo: meta.prolongacao_motivo,
    prolongacaoAprovada: meta.prolongacao_aprovada, // 'sim' | 'nao' | undefined
    prolongacaoEm: formatPrazo(meta.prolongacao_em),
    origemArea: meta.origem_area,
    origemContexto: meta.origem_contexto,
    respostaAlmox: meta.resposta_almox,
    respostaAlmoxPor: meta.resposta_almox_por,
    respostaAlmoxEm: formatPrazo(meta.resposta_almox_em),
    observacao: meta.obs || textos.join(' | '),
  };
}

function labelEtapa(status: StatusPublico, entregaSolicitada: boolean) {
  if (status === 'finalizado' && entregaSolicitada) return 'A caminho';
  return STATUS_LABEL[status].label;
}

function pedidoEhFrota(pedido: Pick<Requisicao, 'itens'>) {
  return (Array.isArray(pedido.itens) ? pedido.itens : []).some((item) => {
    const tipo = String(item?.tipo || '').toLowerCase();
    return tipo === 'carro' || Boolean(item?.placa || item?.modelo || item?.uso_frota || item?.uso_frota_label);
  });
}

function labelPedido(status: StatusPublico, entregaSolicitada: boolean, isFrota: boolean, meta: ReturnType<typeof extrairMeta>) {
  if (status === 'cancelado') return 'SolicitaÃ§Ã£o negada';
  if (isFrota) {
    if (meta.frotaStatus === 'liberada' || meta.decisao === 'frota_liberada') return 'VeÃ­culo liberado';
    if (meta.frotaStatus === 'negada' || meta.decisao === 'frota_negada') return 'SolicitaÃ§Ã£o negada';
    return 'Aguardando liberaÃ§Ã£o';
  }
  if (status === 'aguardando') return 'Aguardando anÃ¡lise';
  return labelEtapa(status, entregaSolicitada);
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

  // Cancelamento pelo solicitante
  const [cancelTarget, setCancelTarget] = useState<Requisicao | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [toast, setToast] = useState('');

  // ProlongaÃ§Ã£o pelo solicitante
  const [prolongTarget, setProlongTarget] = useState<Requisicao | null>(null);
  const [prolongData, setProlongData] = useState('');
  const [prolongMotivo, setProlongMotivo] = useState('');
  const [prolongando, setProlongando] = useState(false);

  /** Repete o pedido criando direto uma nova requisiÃ§Ã£o (sem passar pelo form).
      Clona obra + itens + observaÃ§Ã£o humana. MantÃ©m as URLs das fotos do
      Supabase Storage (item.foto_material continua vÃ¡lido). */
  async function repetirPedidoDireto(p: Requisicao) {
    if (!nome || !tel) {
      showToast('Volta pra tela inicial e informe nome e WhatsApp.');
      return;
    }
    try {
      // Limpa metas tÃ©cnicas do observacao antigo, mantÃ©m sÃ³ o "obs:" humano
      const obsLimpo = String(p.observacao || '')
        .split('|')
        .map(s => s.trim())
        .filter(s => s.startsWith('obs:'))
        .map(s => s.slice(4).trim())
        .join(' ');

      // ReconstrÃ³i o observacao com metas bÃ¡sicas + flag de repetiÃ§Ã£o
      const novaObs = [
        `cargo:Solicitante`,
        `prioridade:normal`,
        `entrega:nao`,
        `repetido_de:${p.id}`,
        obsLimpo ? `obs:${obsLimpo}` : '',
      ].filter(Boolean).join(' | ');

      // Itens vÃ£o idÃªnticos â€” mantÃ©m URLs de fotos antigas (Storage do Supabase)
      const novosItens = (p.itens || []).map(it => ({
        ...it,
        fase_rastreio: 0, // reseta rastreio
      }));

      const { data: inserted, error } = await supabase
        .from('requisicoes_almoxarifado')
        .insert({
          solicitante_id: null,
          solicitante_nome: nome,
          telefone: tel,
          obra: p.obra,
          observacao: novaObs,
          itens: novosItens,
        })
        .select('id')
        .single();

      if (error) throw error;

      showToast('âœ… Pedido repetido. Almoxarifado jÃ¡ recebeu.');
      void carregar(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao repetir: ${msg}`);
    }
  }

  function podeProlongar(p: Requisicao) {
    const meta = extrairMeta(p.observacao);
    const status = inferirStatusPublico(p);
    // SÃ³ permite prolongar se foi liberado (frota) ou separado/finalizado (ferramenta)
    if (status === 'cancelado' || status === 'recebido') return false;
    const liberadaFrota = meta.frotaStatus === 'liberada' || meta.decisao === 'frota_liberada';
    if (liberadaFrota) return true;
    if (status === 'separado' || status === 'finalizado') return true;
    return false;
  }

  async function confirmarProlongacao() {
    if (!prolongTarget) return;
    if (!prolongData) { showToast('Informe a nova data/hora prevista.'); return; }
    setProlongando(true);
    try {
      const novaIso = new Date(prolongData).toISOString();
      const obsAtual = prolongTarget.observacao || '';
      const partes = obsAtual
        .split('|')
        .map(p => p.trim())
        .filter(Boolean)
        .filter(p => {
          const idx = p.indexOf(':');
          if (idx <= 0) return true;
          const chave = p.slice(0, idx).trim();
          return !['prolongacao_pedida', 'prolongacao_motivo', 'prolongacao_aprovada', 'prolongacao_em'].includes(chave);
        });
      partes.push(`prolongacao_pedida:${novaIso}`);
      if (prolongMotivo.trim()) partes.push(`prolongacao_motivo:${prolongMotivo.trim().replace(/\|/g, '/')}`);
      partes.push(`prolongacao_em:${new Date().toISOString()}`);
      const novaObs = partes.join(' | ');
      const { error } = await supabase
        .from('requisicoes_almoxarifado')
        .update({ observacao: novaObs })
        .eq('id', prolongTarget.id);
      if (error) throw error;
      setProlongTarget(null);
      setProlongData('');
      setProlongMotivo('');
      showToast('Pedido de prolongaÃ§Ã£o enviado ao almoxarifado.');
      void carregar(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao solicitar prolongaÃ§Ã£o: ${msg}`);
    } finally {
      setProlongando(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function pedeMotivoCancelamento(p: Requisicao) {
    // Se jÃ¡ foi liberado/separando, exige motivo. Se ainda estÃ¡ aguardando, motivo Ã© opcional.
    const meta = extrairMeta(p.observacao);
    const status = inferirStatusPublico(p);
    const liberadaFrota = meta.frotaStatus === 'liberada' || meta.decisao === 'frota_liberada';
    return liberadaFrota || status === 'separando' || status === 'separado' || status === 'finalizado';
  }

  function podeCancelarPedido(p: Requisicao) {
    const status = inferirStatusPublico(p);
    return status !== 'recebido' && status !== 'cancelado';
  }

  async function registrarMovimentacaoCancelamentoPublico(pedido: Requisicao, motivo: string) {
    try {
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      const rows = itens
        .filter((it) => it.item_id && it.item_id !== '__OUTRO__')
        .map((it) => ({
          item_id: it.item_id,
          tipo: 'cancelamento',
          quantidade: Number(it.quantidade ?? 1) || 1,
          obra: pedido.obra || null,
          observacao: `Pedido ${pedido.id.slice(0, 8)} cancelado pelo solicitante${motivo ? ` - ${motivo}` : ''}`,
          data: new Date().toISOString().slice(0, 10),
        }));
      if (rows.length === 0) return;
      await supabase.from('movimentacoes_almoxarifado').insert(rows);
    } catch (err) {
      console.warn('[FilaPublica] rastro de cancelamento nÃ£o registrado:', err);
    }
  }

  async function confirmarCancelamentoSolicitante() {
    if (!cancelTarget) return;
    const motivoObrigatorio = pedeMotivoCancelamento(cancelTarget);
    const motivo = cancelMotivo.trim();
    if (motivoObrigatorio && !motivo) {
      showToast('Informe o motivo do cancelamento.');
      return;
    }

    setCancelando(true);
    try {
      const now = new Date().toISOString();
      const obsAtual = cancelTarget.observacao || '';
      const partes = obsAtual
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((p) => {
          const idx = p.indexOf(':');
          if (idx <= 0) return true;
          const chave = p.slice(0, idx).trim();
          return ![
            'cancelado_em',
            'motivo_cancelamento',
            'cancelado_por',
            'frota_status',
          ].includes(chave);
        });
      partes.push(`cancelado_em:${now}`);
      partes.push(`cancelado_por:solicitante`);
      if (motivo) partes.push(`motivo_cancelamento:${motivo.replace(/\|/g, '/')}`);
      // Se for frota liberada, marca como cancelada tambÃ©m no campo frota_status
      const meta = extrairMeta(cancelTarget.observacao);
      const eraLiberada = meta.frotaStatus === 'liberada' || meta.decisao === 'frota_liberada';
      if (eraLiberada) partes.push('frota_status:cancelada');

      const novaObs = partes.join(' | ');

      const { error } = await supabase
        .from('requisicoes_almoxarifado')
        .update({ status: 'cancelada', observacao: novaObs })
        .eq('id', cancelTarget.id);

      if (error) throw error;

      await registrarMovimentacaoCancelamentoPublico(cancelTarget, motivo);

      // Se era frota liberada, libera o agendamento no calendÃ¡rio
      if (eraLiberada) {
        try {
          await supabase
            .from('agendamentos_almoxarifado')
            .update({ status: 'cancelado' })
            .ilike('descricao', `%${cancelTarget.id}%`);
        } catch (errAg) {
          console.warn('[FilaPublica] falha ao cancelar agendamento:', errAg);
        }
      }

      setCancelTarget(null);
      setCancelMotivo('');
      showToast('Pedido cancelado.');
      void carregar(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Erro ao cancelar: ${msg}`);
    } finally {
      setCancelando(false);
    }
  }

  const carregar = useCallback(async (silencioso = false) => {
    if (!tel) {
      setErro('Telefone nÃ£o informado.');
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
      if (filaRes.error) console.warn('[FilaPublica] fila geral indisponÃ­vel:', filaRes.error);

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
            â† Voltar ao inÃ­cio
          </Link>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_24px_60px_rgba(0,0,0,0.35)] px-5 py-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[#9fb8f5] text-xs font-black uppercase tracking-[0.18em] mb-2">Almoxarifado Â· Biasi Engenharia</p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-white">Meus Pedidos</h1>
              {nome && <p className="text-[#c8d6ff] text-sm mt-1">OlÃ¡, {nome}!</p>}
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
              Ãšltima atualizaÃ§Ã£o: {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
            <p className="text-[#c8d6ff]">Nenhum pedido encontrado para este nÃºmero.</p>
          </div>
        )}

        <div className="space-y-4">
          {pedidos.map((p) => {
            const statusPublico = inferirStatusPublico(p);
            const st = STATUS_LABEL[statusPublico];
            const meta = extrairMeta(p.observacao);
            const isFrota = pedidoEhFrota(p);
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
                    {labelPedido(statusPublico, meta.entregaSolicitada, isFrota, meta)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-[0.68rem] uppercase tracking-widest text-[#8fa6da] font-black">Pedidos na frente</p>
                    <p className="text-2xl font-black text-white mt-1">{estaNaFila ? pedidosNaFrente : 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-[0.68rem] uppercase tracking-widest text-[#8fa6da] font-black">Sua posiÃ§Ã£o</p>
                    <p className="text-2xl font-black text-white mt-1">{posicao ?? (statusPublico === 'recebido' ? 'OK' : '-')}</p>
                  </div>
                </div>

                {!isFrota && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-1">
                      {ETAPAS.map((etapa, index) => {
                        const ativa = index <= etapaIndex && statusPublico !== 'cancelado';
                        return (
                          <div key={etapa} className="flex-1">
                            <div className={`h-2 rounded-full ${ativa ? 'bg-[#5c9bff]' : 'bg-white/10'}`} />
                            <p className={`mt-1 text-[0.6rem] text-center font-bold ${ativa ? 'text-[#cfe0ff]' : 'text-[#607399]'}`}>
                              {labelEtapa(etapa, meta.entregaSolicitada)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {(Array.isArray(p.itens) ? p.itens : []).map((it, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#e6edff] border-t border-white/8 pt-2 first:border-t-0 first:pt-0">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#5c9bff] shrink-0" />
                      <span>
                        <strong>{it.quantidade ?? '-'} {it.unidade ?? ''}</strong> Â· {it.descricao || it.nome || 'Item'}
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
                  {meta.devolucao && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/10 px-3 py-1">
                      <Clock size={12} />
                      DevoluÃ§Ã£o: {meta.devolucao}
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
                  {!isFrota && (
                    <span className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1">
                      Entrega: {meta.entregaSolicitada ? 'Sim' : 'NÃ£o'}
                    </span>
                  )}
                </div>

                {isFrota && statusPublico === 'aguardando' && !meta.motivoNegativa && meta.frotaStatus !== 'liberada' && (
                  <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    Aguardando resposta do almoxarifado para liberaÃ§Ã£o do veÃ­culo.
                  </div>
                )}

                {meta.respostaAlmox && (
                  <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    <strong>Resposta do almoxarifado:</strong> {meta.respostaAlmox}
                    <br />
                    <span className="text-amber-100/80">
                      {meta.respostaAlmoxPor || 'Almoxarifado'}
                      {meta.respostaAlmoxEm ? ` em ${meta.respostaAlmoxEm}` : ''}
                    </span>
                  </div>
                )}
                {isFrota && (meta.frotaStatus === 'liberada' || meta.decisao === 'frota_liberada') && (
                  <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                    VeÃ­culo liberado{meta.prazo ? ` a partir de ${meta.prazo}` : ''}{meta.devolucao ? ` atÃ© ${meta.devolucao}` : ''}.
                  </div>
                )}

                {statusPublico === 'cancelado' && meta.motivoNegativa && !meta.canceladoPor && (
                  <div className="mt-3 rounded-2xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-xs text-red-100">
                    <strong>SolicitaÃ§Ã£o negada pelo almoxarifado.</strong>
                    <br />
                    Motivo: {meta.motivoNegativa}
                  </div>
                )}

                {statusPublico === 'cancelado' && meta.canceladoPor === 'solicitante' && (
                  <div className="mt-3 rounded-2xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-xs text-red-100">
                    <strong>Pedido cancelado por vocÃª</strong>
                    {meta.canceladoEm ? ` em ${meta.canceladoEm}` : ''}.
                    {meta.motivoCancelamento && (
                      <>
                        <br />
                        Motivo: {meta.motivoCancelamento}
                      </>
                    )}
                  </div>
                )}

                {meta.freteTipo && (
                  <div className="mt-3 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
                    <strong>Frete:</strong>{' '}
                    {meta.freteTipo === 'terceiro'
                      ? `Terceiro${meta.freteTerceiroNome ? ` - ${meta.freteTerceiroNome}` : ''}${meta.freteTerceiroContato ? ` (${meta.freteTerceiroContato})` : ''}`
                      : 'Biasi Engenharia'}
                  </div>
                )}

                {meta.recebidoPorNome && (
                  <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                    <strong>Recebido por:</strong> {meta.recebidoPorNome}
                    {meta.recebidoEm ? ` em ${meta.recebidoEm}` : ''}
                  </div>
                )}

                {meta.entreguePor && (
                  <div className="mt-3 rounded-2xl border border-blue-300/25 bg-blue-400/10 px-3 py-2 text-xs text-blue-100">
                    <strong>Entregue por:</strong> {meta.entreguePor}
                    {meta.entregueEm ? ` em ${meta.entregueEm}` : ''}
                  </div>
                )}

                {meta.prolongacaoPedida && !meta.prolongacaoAprovada && (
                  <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                    <strong>ProlongaÃ§Ã£o solicitada</strong> atÃ© {meta.prolongacaoPedidaFmt}
                    {meta.prolongacaoMotivo ? ` â€” ${meta.prolongacaoMotivo}` : ''}.
                    <br />
                    Aguardando aprovaÃ§Ã£o do almoxarifado.
                  </div>
                )}

                {meta.prolongacaoAprovada === 'sim' && (
                  <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                    <strong>ProlongaÃ§Ã£o aprovada</strong> atÃ© {meta.prolongacaoPedidaFmt}.
                  </div>
                )}

                {meta.prolongacaoAprovada === 'nao' && (
                  <div className="mt-3 rounded-2xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-xs text-red-100">
                    <strong>ProlongaÃ§Ã£o negada.</strong> Devolva no prazo original.
                  </div>
                )}

                {meta.observacao && (
                  <p className="text-xs text-[#9fb0da] mt-3 border-t border-white/10 pt-3">{meta.observacao}</p>
                )}

                <div className="mt-4 flex items-center gap-2 text-[0.78rem] text-[#8fa6da]">
                  {statusPublico === 'recebido' ? <CheckCircle2 size={14} className="text-emerald-300" /> : <Truck size={14} className="text-[#8fb2ff]" />}
                  <span>
                    {statusPublico === 'recebido'
                      ? 'Pedido recebido. Esse status veio do app do almoxarifado.'
                      : 'Quando o almoxarifado avanÃ§ar no app, essa tela atualiza aqui.'}
                  </span>
                </div>

                <div className="mt-3 flex justify-end gap-2 flex-wrap">
                  {/* Prolongar agendamento: pra pedidos liberados de frota ou separados de ferramenta.
                       Pede nova data e motivo. Almoxarifado vÃª e aprova/nega. */}
                  {podeProlongar(p) && !meta.prolongacaoPedida && (
                    <button
                      type="button"
                      onClick={() => {
                        setProlongTarget(p);
                        const sugerido = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        const pad = (n: number) => String(n).padStart(2, '0');
                        setProlongData(`${sugerido.getFullYear()}-${pad(sugerido.getMonth() + 1)}-${pad(sugerido.getDate())}T${pad(sugerido.getHours())}:${pad(sugerido.getMinutes())}`);
                        setProlongMotivo('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(54,196,133,0.45)] bg-[rgba(54,196,133,0.12)] px-3 py-1.5 text-[0.75rem] font-bold text-[#abf5d1] hover:bg-[rgba(54,196,133,0.22)] transition"
                    >
                      <Clock size={13} />
                      Prolongar
                    </button>
                  )}

                  {/* Repetir pedido: cria DIRETO uma nova requisiÃ§Ã£o clonando
                      obra + itens + observaÃ§Ã£o humana do pedido antigo. Sem
                      passar pelo form â€” clica e pronto. As fotos URLs sÃ£o
                      reaproveitadas (Supabase Storage) entÃ£o o almoxarifado
                      continua vendo as imagens. */}
                  <button
                    type="button"
                    onClick={() => repetirPedidoDireto(p)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(113,154,255,0.45)] bg-[rgba(113,154,255,0.12)] px-3 py-1.5 text-[0.75rem] font-bold text-[#cad8ff] hover:bg-[rgba(113,154,255,0.22)] transition"
                  >
                    <RotateCcw size={13} />
                    Repetir pedido
                  </button>

                  {podeCancelarPedido(p) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelTarget(p);
                        setCancelMotivo('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(255,122,157,0.45)] bg-[rgba(255,122,157,0.12)] px-3 py-1.5 text-[0.75rem] font-bold text-[#ffd9e3] hover:bg-[rgba(255,122,157,0.22)] transition"
                    >
                      <XCircle size={13} />
                      Cancelar pedido
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <a
          href={`/req?tel=${tel}&nome=${encodeURIComponent(nome)}`}
          className="block mt-6 text-center bg-[linear-gradient(180deg,#6257ff,#493fe6)] hover:opacity-95 text-white font-black py-4 px-6 rounded-2xl transition shadow-[0_16px_30px_rgba(78,70,225,0.35)]"
        >
          + Nova RequisiÃ§Ã£o
        </a>

        <p className="text-center text-[#4f638f] text-xs mt-6">BiasiHub Â· Almoxarifado Â· Biasi Engenharia e InstalaÃ§Ãµes</p>
      </div>

      {prolongTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(54,196,133,0.35)] bg-[linear-gradient(180deg,#172540,#0f1c34)] p-5 shadow-2xl">
            <h3 className="m-0 text-xl font-black text-white">Prolongar agendamento</h3>
            <p className="mt-2 text-sm text-[#cbd6ff]">
              Informe a nova data e hora prevista de devoluÃ§Ã£o. O almoxarifado precisa aprovar.
            </p>
            <label className="block mt-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9db2e7]">Nova data prevista *</span>
              <input
                type="datetime-local"
                step="900"
                value={prolongData}
                onChange={(e) => setProlongData(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[rgba(54,196,133,0.35)] bg-[rgba(10,30,77,0.55)] px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="block mt-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9db2e7]">Motivo (opcional)</span>
              <textarea
                className="mt-1 min-h-[90px] w-full rounded-2xl border border-[rgba(54,196,133,0.35)] bg-[rgba(10,30,77,0.55)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9db2e7]"
                placeholder="Por que precisa de mais tempo?"
                value={prolongMotivo}
                onChange={(e) => setProlongMotivo(e.target.value)}
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={prolongando}
                onClick={() => { setProlongTarget(null); setProlongData(''); setProlongMotivo(''); }}
                className="rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.45)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={prolongando}
                onClick={confirmarProlongacao}
                className="rounded-xl border border-[rgba(54,196,133,0.45)] bg-[rgba(54,196,133,0.18)] px-4 py-2 text-sm font-bold text-[#abf5d1] disabled:opacity-50"
              >
                {prolongando ? 'Enviando...' : 'Solicitar prolongaÃ§Ã£o'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(255,122,157,0.35)] bg-[linear-gradient(180deg,#172540,#0f1c34)] p-5 shadow-2xl">
            <h3 className="m-0 text-xl font-black text-white">Cancelar pedido</h3>
            <p className="mt-2 text-sm text-[#cbd6ff]">
              {pedeMotivoCancelamento(cancelTarget)
                ? 'Este pedido jÃ¡ foi liberado/iniciado. Informe o motivo do cancelamento â€” o almoxarifado verÃ¡ esta justificativa.'
                : 'Tem certeza que deseja cancelar este pedido? VocÃª pode informar um motivo se quiser.'}
            </p>
            <textarea
              className="mt-4 min-h-[110px] w-full rounded-2xl border border-[rgba(255,122,157,0.35)] bg-[rgba(10,30,77,0.55)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9db2e7]"
              placeholder={pedeMotivoCancelamento(cancelTarget) ? 'Motivo do cancelamento *' : 'Motivo (opcional)'}
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              autoFocus
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={cancelando}
                onClick={() => {
                  setCancelTarget(null);
                  setCancelMotivo('');
                }}
                className="rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,30,77,0.45)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelando}
                onClick={confirmarCancelamentoSolicitante}
                className="rounded-xl border border-[rgba(255,122,157,0.45)] bg-[rgba(255,122,157,0.18)] px-4 py-2 text-sm font-bold text-[#ffd9e3] disabled:opacity-50"
              >
                {cancelando ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(10,31,78,0.95)] px-4 py-2.5 text-sm font-bold text-white shadow-2xl z-[120]">
          {toast}
        </div>
      )}
    </div>
  );
}
