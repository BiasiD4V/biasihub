import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, AlertCircle, Truck, Wrench, X, CheckCircle2, Search } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ReqItem {
  tipo?: string;          // 'material' | 'ferramenta' | 'carro'
  descricao?: string;
  nome?: string;
  quantidade?: number;
  unidade?: string;
  placa?: string | null;
  modelo?: string | null;
  item_id?: string | null;
}

interface Pedido {
  id: string;
  criado_em: string;
  obra: string;
  status: string | null;
  itens: ReqItem[] | null;
  observacao: string | null;
  solicitante_nome: string | null;
  telefone: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
  devolucao_real: string | null;
  recebido_por_devolucao: string | null;
  condicao_devolucao: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDataHora(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function diasDesde(iso: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Lê 'devolucao:YYYY-MM-DDTHH:mm' do campo observacao do pedido. */
function lerDevolucaoPrevista(obs: string | null): string | null {
  if (!obs) return null;
  const partes = obs.split('|').map(p => p.trim());
  for (const p of partes) {
    const idx = p.indexOf(':');
    if (idx <= 0) continue;
    const chave = p.slice(0, idx).trim();
    const valor = p.slice(idx + 1).trim();
    if (chave === 'devolucao' && valor) return valor;
  }
  return null;
}

function ehFrota(itens: ReqItem[] | null): boolean {
  if (!itens) return false;
  return itens.some(i => i.tipo === 'carro');
}

function ehFerramenta(itens: ReqItem[] | null): boolean {
  if (!itens) return false;
  return itens.some(i => i.tipo === 'ferramenta');
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ControleDevolucao() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'' | 'frota' | 'ferramenta'>('');
  const [filtroAtraso, setFiltroAtraso] = useState<'' | 'atrasado' | 'no_prazo'>('');
  const [busca, setBusca] = useState('');

  // Modal de devolução
  const [target, setTarget] = useState<Pedido | null>(null);
  const [recebidoPor, setRecebidoPor] = useState('');
  const [condicao, setCondicao] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    setErro('');
    try {
      // Carrega pedidos liberados/finalizados que ainda não tiveram devolução registrada
      // E que envolvem ferramenta ou veículo (insumo é consumível, não tem devolução)
      const { data, error } = await supabase
        .from('requisicoes_almoxarifado')
        .select('id, criado_em, obra, status, itens, observacao, solicitante_nome, telefone, iniciado_em, finalizado_em, devolucao_real, recebido_por_devolucao, condicao_devolucao')
        .is('devolucao_real', null)
        .in('status', ['liberada', 'liberado', 'em_andamento', 'separando', 'separado', 'finalizada', 'finalizado'])
        .order('criado_em', { ascending: false })
        .limit(500);
      if (error) throw error;
      // Filtra os que têm pelo menos 1 item de ferramenta ou veículo
      const filtrados = (data || []).filter((p: any) => ehFerramenta(p.itens) || ehFrota(p.itens));
      setPedidos(filtrados as Pedido[]);
    } catch (err: any) {
      console.error('[ControleDevolucao] erro:', err);
      setErro(err?.message ?? 'Erro ao carregar pedidos pendentes de devolução.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  // Filtros
  const pedidosVisiveis = useMemo(() => {
    return pedidos.filter(p => {
      const isFrota = ehFrota(p.itens);
      if (filtroTipo === 'frota' && !isFrota) return false;
      if (filtroTipo === 'ferramenta' && !ehFerramenta(p.itens)) return false;

      const dev = lerDevolucaoPrevista(p.observacao);
      if (filtroAtraso) {
        if (!dev) return filtroAtraso === 'no_prazo'; // sem previsão = não atrasado
        const atrasado = new Date(dev).getTime() < Date.now();
        if (filtroAtraso === 'atrasado' && !atrasado) return false;
        if (filtroAtraso === 'no_prazo' && atrasado) return false;
      }

      if (busca.trim()) {
        const b = busca.toLowerCase();
        const ok = (
          (p.solicitante_nome || '').toLowerCase().includes(b) ||
          (p.obra || '').toLowerCase().includes(b) ||
          (p.itens || []).some(i => (i.descricao || '').toLowerCase().includes(b) || (i.placa || '').toLowerCase().includes(b))
        );
        if (!ok) return false;
      }

      return true;
    });
  }, [pedidos, filtroTipo, filtroAtraso, busca]);

  function abrirModal(p: Pedido) {
    setTarget(p);
    setRecebidoPor(usuario?.nome || '');
    setCondicao('');
    setObs('');
  }

  function fecharModal() {
    setTarget(null);
    setRecebidoPor('');
    setCondicao('');
    setObs('');
  }

  async function confirmarDevolucao() {
    if (!target) return;
    if (!recebidoPor.trim()) { setErro('Informe quem recebeu de volta.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const agora = new Date().toISOString();

      // 1) Atualiza requisição com a devolução real
      const { error: errReq } = await supabase
        .from('requisicoes_almoxarifado')
        .update({
          devolucao_real: agora,
          recebido_por_devolucao: recebidoPor.trim(),
          condicao_devolucao: [condicao.trim(), obs.trim()].filter(Boolean).join(' | ') || null,
        })
        .eq('id', target.id);
      if (errReq) throw errReq;

      // 2) Se for frota, encerra o agendamento ligado pelo id no descricao
      if (ehFrota(target.itens)) {
        try {
          await supabase
            .from('agendamentos_almoxarifado')
            .update({ status: 'concluido' })
            .ilike('descricao', `%${target.id}%`)
            .eq('status', 'ativo');
        } catch (errAg) {
          console.warn('[ControleDevolucao] falha ao concluir agendamento:', errAg);
        }
      }

      // 3) Registra movimentação 'devolucao' por item (com item_id e quantidade)
      // Apenas itens com item_id válido (uuid) — itens livres (__OUTRO__) entram com item_id=null
      // mas a tabela movimentacoes_almoxarifado exige item_id NOT NULL, então pulamos.
      const movs = (target.itens || [])
        .filter(it => it.item_id && (it.tipo === 'ferramenta' || it.tipo === 'carro'))
        .map(it => ({
          item_id: it.item_id!,
          tipo: 'devolucao',
          quantidade: Number(it.quantidade ?? 1),
          obra: target.obra,
          responsavel_id: usuario!.id,
          observacao: `Devolução do pedido ${target.id.slice(0, 8)} — ${recebidoPor.trim()}${condicao ? ' — ' + condicao : ''}`,
        }));
      if (movs.length > 0) {
        const { error: errMov } = await supabase.from('movimentacoes_almoxarifado').insert(movs);
        if (errMov) {
          console.warn('[ControleDevolucao] erro ao registrar movimentações:', errMov);
        }
      }

      fecharModal();
      await carregar();
    } catch (err: any) {
      setErro(err?.message ?? 'Erro ao registrar devolução.');
    } finally {
      setSalvando(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderItens(itens: ReqItem[] | null) {
    if (!itens || itens.length === 0) return <span className="text-slate-400 italic">sem itens</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {itens.slice(0, 4).map((it, idx) => {
          const isCarro = it.tipo === 'carro';
          const label = isCarro
            ? (it.placa ? `${it.placa} - ${it.modelo}` : it.modelo || it.descricao || 'Veículo')
            : `${it.quantidade ?? 1}× ${it.descricao || it.nome || '(sem nome)'}`;
          return (
            <span key={idx} className={`text-[11px] px-2 py-1 rounded-md font-medium ${isCarro ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {isCarro ? <Truck className="inline" size={10} /> : <Wrench className="inline" size={10} />} {label}
            </span>
          );
        })}
        {itens.length > 4 && <span className="text-[11px] text-slate-400">+{itens.length - 4}</span>}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowLeftRight size={22} className="text-blue-600" />
            Controle de Devolução
          </h1>
          <p className="text-sm text-slate-500 mt-1">Itens, ferramentas e veículos fora do almoxarifado</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-slate-800">{pedidos.length}</p>
          <p className="text-xs text-slate-500">aguardando devolução</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por solicitante, obra, item..."
            className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os tipos</option>
          <option value="frota">Veículos</option>
          <option value="ferramenta">Ferramentas</option>
        </select>
        <select value={filtroAtraso} onChange={e => setFiltroAtraso(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos</option>
          <option value="atrasado">Atrasados</option>
          <option value="no_prazo">No prazo</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{pedidosVisiveis.length} pedido(s)</span>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <AlertCircle size={14} />
          {erro}
          <button onClick={() => carregar()} className="ml-auto text-red-700 underline">Tentar novamente</button>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : pedidosVisiveis.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-600 font-bold">Nenhum item pendente de devolução</p>
            <p className="text-slate-400 text-sm mt-1">Tudo devolvido — bom trabalho!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pedidosVisiveis.map(p => {
              const dev = lerDevolucaoPrevista(p.observacao);
              const atrasado = dev ? new Date(dev).getTime() < Date.now() : false;
              const dias = diasDesde(p.iniciado_em || p.criado_em);
              return (
                <div key={p.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-700">{p.solicitante_nome || 'Solicitante'}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{p.obra}</span>
                      {atrasado && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full ml-1">
                          Atrasado
                        </span>
                      )}
                    </div>
                    <div className="mb-1.5">{renderItens(p.itens)}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                      <span>Retirou em {fmtDataHora(p.iniciado_em || p.criado_em)}</span>
                      {dias !== null && <span>{dias} dia(s) com o solicitante</span>}
                      {dev && <span className={atrasado ? 'text-red-600 font-bold' : ''}>Devolução prevista: {fmtDataHora(dev)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => abrirModal(p)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Registrar devolução
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {target && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={fecharModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Registrar devolução</h3>
              <button onClick={fecharModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Pedido de</p>
                <p className="text-sm font-bold text-slate-700">{target.solicitante_nome || 'Solicitante'} · {target.obra}</p>
                <div className="mt-2">{renderItens(target.itens)}</div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Quem recebeu *</label>
                <input
                  type="text"
                  value={recebidoPor}
                  onChange={e => setRecebidoPor(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Condição</label>
                <select value={condicao} onChange={e => setCondicao(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  <option value="Intacto">Intacto / sem danos</option>
                  <option value="Danificado">Danificado</option>
                  <option value="Faltando peça">Faltando peça</option>
                  <option value="Sujo / precisa de manutenção">Sujo / precisa de manutenção</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Observação</label>
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
                  placeholder="Detalhes do estado do item, peças faltando, etc..."
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {erro && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{erro}</p>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={fecharModal} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancelar
              </button>
              <button onClick={confirmarDevolucao} disabled={salvando}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl">
                {salvando ? 'Registrando...' : 'Confirmar devolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
