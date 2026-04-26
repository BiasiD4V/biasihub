import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

type StatusOC = 'rascunho' | 'enviada' | 'recebida' | 'cancelada';

interface OrdemCompra {
  id: string;
  numero: number;
  status: StatusOC;
  obra: string | null;
  total_estimado: number | null;
  observacao: string | null;
  criado_em: string;
  data_envio: string | null;
  data_recebimento: string | null;
  fornecedores: { nome: string } | null;
  itens_ordem_compra: {
    id: string;
    quantidade: number;
    preco_unitario: number | null;
    quantidade_recebida: number;
    itens_almoxarifado: { descricao: string; unidade: string } | null;
  }[];
}

interface Fornecedor { id: string; nome: string; }
interface ItemAlmox { id: string; codigo: string; descricao: string; unidade: string; }

const STATUS_CONFIG: Record<StatusOC, { label: string; cor: string; prox: StatusOC | null; acaoBt: string }> = {
  rascunho: { label: 'Rascunho', cor: 'bg-slate-100 text-slate-600', prox: 'enviada', acaoBt: 'Enviar ao fornecedor' },
  enviada:  { label: 'Enviada',  cor: 'bg-blue-100 text-blue-700',  prox: 'recebida', acaoBt: 'Confirmar recebimento' },
  recebida: { label: 'Recebida', cor: 'bg-emerald-100 text-emerald-700', prox: null, acaoBt: '' },
  cancelada:{ label: 'Cancelada',cor: 'bg-rose-100 text-rose-700',  prox: null, acaoBt: '' },
};

const COLUNAS: StatusOC[] = ['rascunho', 'enviada', 'recebida'];

export function OrdensCompra() {
  const { usuario } = useAuth();
  const isGestor = ['gestor', 'admin', 'dono'].includes(usuario?.papel || '');
  const [ordens, setOrdens] = useState<OrdemCompra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [itensAlmox, setItensAlmox] = useState<ItemAlmox[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({ fornecedor_id: '', obra: '', observacao: '' });
  const [linhas, setLinhas] = useState<{ item_id: string; quantidade: string; preco_unitario: string }[]>([
    { item_id: '', quantidade: '', preco_unitario: '' }
  ]);

  useEffect(() => { carregar(); carregarOpcoes(); }, []);

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordens_compra')
        .select('*, fornecedores(nome), itens_ordem_compra(id, quantidade, preco_unitario, quantidade_recebida, itens_almoxarifado(descricao, unidade))')
        .neq('status', 'cancelada')
        .order('numero', { ascending: false });
      if (error) throw error;
      setOrdens(data || []);
    } catch (err) {
      console.error('[OrdensCompra] erro ao carregar ordens:', err);
      setOrdens([]);
    } finally {
      setLoading(false);
    }
  }

  async function carregarOpcoes() {
    try {
      const [fRes, iRes] = await Promise.all([
        supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('itens_almoxarifado').select('id, codigo, descricao, unidade').eq('ativo', true).order('descricao'),
      ]);

      if (fRes.error) throw fRes.error;
      if (iRes.error) throw iRes.error;

      setFornecedores(fRes.data || []);
      setItensAlmox(iRes.data || []);
    } catch (err) {
      console.error('[OrdensCompra] erro ao carregar opcoes:', err);
      setFornecedores([]);
      setItensAlmox([]);
    }
  }

  async function salvarOC() {
    setSalvando(true);
    try {
      const linhasValidas = linhas.filter(l => l.item_id && l.quantidade);
      const total = linhasValidas.reduce((s, l) => s + (Number(l.preco_unitario) || 0) * Number(l.quantidade), 0);

      const { data: oc, error: ocError } = await supabase.from('ordens_compra').insert({
        fornecedor_id: form.fornecedor_id || null,
        obra: form.obra || null,
        observacao: form.observacao || null,
        total_estimado: total || null,
        criado_por: usuario?.id,
      }).select().single();

      if (ocError) throw ocError;

      if (oc && linhasValidas.length) {
        const { error: itensError } = await supabase.from('itens_ordem_compra').insert(
          linhasValidas.map(l => ({
            ordem_id: oc.id,
            item_id: l.item_id,
            quantidade: Number(l.quantidade),
            preco_unitario: l.preco_unitario ? Number(l.preco_unitario) : null,
          }))
        );
        if (itensError) throw itensError;
      }

      setModal(false);
      setForm({ fornecedor_id: '', obra: '', observacao: '' });
      setLinhas([{ item_id: '', quantidade: '', preco_unitario: '' }]);
      await carregar();
    } catch (err) {
      console.error('[OrdensCompra] erro ao salvar OC:', err);
    } finally {
      setSalvando(false);
    }
  }

  async function avancarStatus(oc: OrdemCompra) {
    const prox = STATUS_CONFIG[oc.status].prox;
    if (!prox) return;
    const extra: Record<string, string> = {};
    if (prox === 'enviada') extra.data_envio = new Date().toISOString();
    if (prox === 'recebida') extra.data_recebimento = new Date().toISOString();
    await supabase.from('ordens_compra').update({ status: prox, ...extra }).eq('id', oc.id);
    carregar();
  }

  async function cancelar(id: string) {
    if (!confirm('Cancelar está ordem de compra?')) return;
    await supabase.from('ordens_compra').update({ status: 'cancelada' }).eq('id', id);
    carregar();
  }

  const totalEstimado = (oc: OrdemCompra) => {
    if (oc.total_estimado) return Number(oc.total_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const total = (oc.itens_ordem_compra || []).reduce((s, i) => s + (Number(i.preco_unitario) || 0) * Number(i.quantidade), 0);
    return total ? total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ' - ';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-violet-500" size={26} />
            Ordens de Compra
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de compras e pedidos a fornecedores</p>
        </div>
        {isGestor && (
          <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Nova OC
          </button>
        )}
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {COLUNAS.map(col => {
            const cfg = STATUS_CONFIG[col];
            const lista = ordens.filter(o => o.status === col);
            return (
              <div key={col} className="bg-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-700 text-sm">{cfg.label}</p>
                  <span className="w-6 h-6 bg-white rounded-full text-xs font-bold text-slate-600 flex items-center justify-center shadow-sm">{lista.length}</span>
                </div>
                <div className="space-y-3">
                  {lista.map(oc => (
                    <div key={oc.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">OC-{String(oc.numero).padStart(4, '0')}</p>
                            <p className="text-xs text-slate-500">{oc.fornecedores?.nome || 'Sem fornecedor'}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cfg.cor}`}>{cfg.label}</span>
                        </div>
                        {oc.obra && <p className="text-xs text-slate-400 mb-2">📍 {oc.obra}</p>}
                        <p className="text-sm font-semibold text-slate-700">{totalEstimado(oc)}</p>
                        <p className="text-xs text-slate-400 mt-1">{oc.itens_ordem_compra?.length || 0} item(ns)  -  {new Date(oc.criado_em).toLocaleDateString('pt-BR')}</p>

                        {/* Expandir itens */}
                        <button onClick={() => setExpandido(expandido === oc.id ? null : oc.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 mt-2 hover:underline">
                          {expandido === oc.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {expandido === oc.id ? 'Ocultar itens' : 'Ver itens'}
                        </button>

                        {expandido === oc.id && (
                          <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                            {(oc.itens_ordem_compra || []).map(it => (
                              <div key={it.id} className="flex justify-between text-xs text-slate-600">
                                <span>{it.itens_almoxarifado?.descricao || '?'}</span>
                                <span className="text-slate-400">{it.quantidade} {it.itens_almoxarifado?.unidade}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Acoes */}
                        {isGestor && (
                          <div className="flex gap-2 mt-3">
                            {cfg.prox && (
                              <button onClick={() => avancarStatus(oc)}
                                className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                                {cfg.acaoBt}
                              </button>
                            )}
                            {oc.status === 'rascunho' && (
                              <button onClick={() => cancelar(oc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {lista.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">Nenhuma OC</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova OC */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-semibold">Nova Ordem de Compra</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fornecedor</label>
                  <select value={form.fornecedor_id} onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecionar...</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Obra</label>
                  <input value={form.obra} onChange={e => setForm(p => ({ ...p, obra: e.target.value }))}
                    placeholder="Nome da obra" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-2">Itens *</label>
                <div className="space-y-2">
                  {linhas.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select value={l.item_id} onChange={e => setLinhas(prev => prev.map((r, j) => j === i ? { ...r, item_id: e.target.value } : r))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Item...</option>
                          {itensAlmox.map(it => <option key={it.id} value={it.id}>{it.descricao} ({it.unidade})</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" placeholder="Qtd" value={l.quantidade}
                          onChange={e => setLinhas(prev => prev.map((r, j) => j === i ? { ...r, quantidade: e.target.value } : r))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" step="0.01" placeholder="R$ unit." value={l.preco_unitario}
                          onChange={e => setLinhas(prev => prev.map((r, j) => j === i ? { ...r, preco_unitario: e.target.value } : r))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {linhas.length > 1 && (
                          <button onClick={() => setLinhas(prev => prev.filter((_, j) => j !== i))} className="text-slate-300 hover:text-rose-500">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setLinhas(prev => [...prev, { item_id: '', quantidade: '', preco_unitario: '' }])}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Adicionar item
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Observação</label>
                <textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Total estimado */}
              {linhas.some(l => l.preco_unitario && l.quantidade) && (
                <div className="bg-slate-50 rounded-lg px-4 py-2 text-sm">
                  <span className="text-slate-500">Total estimado: </span>
                  <span className="font-semibold text-slate-800">
                    {linhas.reduce((s, l) => s + (Number(l.preco_unitario) || 0) * (Number(l.quantidade) || 0), 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={salvarOC} disabled={linhas.every(l => !l.item_id || !l.quantidade) || salvando}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {salvando ? 'Salvando...' : 'Criar OC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

