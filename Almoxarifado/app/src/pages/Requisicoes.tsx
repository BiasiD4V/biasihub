import { useEffect, useState } from 'react';
import { Plus, X, Check, ClipboardList, Search } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import type { Requisicao, StatusRequisicao, RequisicaoItem } from '../domain/entities/Requisicao';
import type { ItemAlmoxarifado } from '../domain/entities/ItemAlmoxarifado';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG: Record<StatusRequisicao, { label: string; cor: string; corBg: string }> = {
  pendente:  { label: 'Pendente',  cor: 'text-amber-700', corBg: 'bg-amber-100' },
  aprovada:  { label: 'Aprovada',  cor: 'text-blue-700',  corBg: 'bg-blue-100'  },
  entregue:  { label: 'Entregue',  cor: 'text-green-700', corBg: 'bg-green-100' },
  cancelada: { label: 'Cancelada', cor: 'text-red-700',   corBg: 'bg-red-100'   },
};

const COLUNAS: StatusRequisicao[] = ['pendente', 'aprovada', 'entregue'];

export function Requisicoes() {
  const { usuario } = useAuth();
  const [reqs, setReqs] = useState<Requisicao[]>([]);
  const [itensDisponiveis, setItensDisponiveis] = useState<ItemAlmoxarifado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ obra: '', observacao: '' });
  const [linhas, setLinhas] = useState<{ item_id: string; quantidade: string; busca: string }[]>([{ item_id: '', quantidade: '', busca: '' }]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const isGestor = usuario?.papel === 'gestor' || usuario?.papel === 'admin' || usuario?.papel === 'dono';

  async function carregar() {
    const [reqsRes, itensRes] = await Promise.all([
      supabase.from('requisicoes_almoxarifado')
        .select('*, solicitante:usuarios!requisicoes_almoxarifado_solicitante_id_fkey(nome)')
        .order('criado_em', { ascending: false }),
      supabase.from('itens_almoxarifado').select('id,codigo,descricao,unidade').eq('ativo', true).order('descricao'),
    ]);
    setReqs((reqsRes.data || []) as unknown as Requisicao[]);
    setItensDisponiveis((itensRes.data || []) as unknown as ItemAlmoxarifado[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function criar() {
    const linhasValidas = linhas.filter(l => l.item_id && l.quantidade && Number(l.quantidade) > 0);
    if (!form.obra.trim() || linhasValidas.length === 0) {
      setErro('Informe a obra e pelo menos um item'); return;
    }
    setSalvando(true); setErro('');

    const itens: RequisicaoItem[] = linhasValidas.map(l => {
      const item = itensDisponiveis.find(i => i.id === l.item_id)!;
      return { item_id: l.item_id, descricao: item.descricao, quantidade: parseFloat(l.quantidade), unidade: item.unidade };
    });

    const { error } = await supabase.from('requisicoes_almoxarifado').insert({
      solicitante_id: usuario!.id,
      obra: form.obra.trim(),
      observacao: form.observacao.trim() || null,
      itens,
    });

    if (error) { setErro(error.message); setSalvando(false); return; }
    await carregar();
    setModalAberto(false);
    setSalvando(false);
    setForm({ obra: '', observacao: '' });
    setLinhas([{ item_id: '', quantidade: '', busca: '' }]);
  }

  async function atualizarStatus(id: string, status: StatusRequisicao) {
    const updates: Record<string, unknown> = { status };
    if (status === 'aprovada') {
      updates.data_aprovacao = new Date().toISOString();
      updates.aprovado_por_id = usuario!.id;
    }
    await supabase.from('requisicoes_almoxarifado').update(updates).eq('id', id);
    setReqs(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  const formatData = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  if (loading) return <div className="p-6 text-center text-slate-400 text-sm">Carregando...</div>;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Requisições</h1>
          <p className="text-sm text-slate-500 mt-1">Solicitações de materiais por obra</p>
        </div>
        <button onClick={() => { setModalAberto(true); setErro(''); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus size={16} />Nova Requisição
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
        {COLUNAS.map(status => {
          const cfg = STATUS_CONFIG[status];
          const col = reqs.filter(r => r.status === status);
          return (
            <div key={status} className="bg-slate-100/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.corBg} ${cfg.cor}`}>{cfg.label}</span>
                <span className="text-xs text-slate-400">{col.length}</span>
              </div>
              <div className="space-y-3">
                {col.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center">
                    <ClipboardList size={20} className="text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Sem requisições</p>
                  </div>
                ) : col.map(r => {
                  const solicitante = r.solicitante as unknown as { nome: string };
                  const itensArr = r.itens as RequisicaoItem[];
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">{r.obra}</p>
                          <p className="text-xs text-slate-400">{solicitante?.nome} · {formatData(r.data_solicitacao)}</p>
                        </div>
                      </div>
                      <div className="space-y-1 mb-3">
                        {itensArr.slice(0, 3).map((it, idx) => (
                          <p key={idx} className="text-xs text-slate-600">• {it.descricao} — {it.quantidade} {it.unidade}</p>
                        ))}
                        {itensArr.length > 3 && <p className="text-xs text-slate-400">+{itensArr.length - 3} mais</p>}
                      </div>
                      {isGestor && status === 'pendente' && (
                        <div className="flex gap-2">
                          <button onClick={() => atualizarStatus(r.id, 'aprovada')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
                            <Check size={12} />Aprovar
                          </button>
                          <button onClick={() => atualizarStatus(r.id, 'cancelada')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
                            <X size={12} />Cancelar
                          </button>
                        </div>
                      )}
                      {isGestor && status === 'aprovada' && (
                        <button onClick={() => atualizarStatus(r.id, 'entregue')}
                          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                          <Check size={12} />Marcar como Entregue
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalAberto(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Nova Requisição</h3>
              <button onClick={() => setModalAberto(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Obra / Local *</label>
                <input value={form.obra} onChange={e => setForm(f => ({ ...f, obra: e.target.value }))} placeholder="Nome da obra ou local de destino"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Itens *</label>
                <div className="space-y-3">
                  {linhas.map((linha, idx) => {
                    const itemSelecionado = itensDisponiveis.find(i => i.id === linha.item_id);
                    const filtrados = !linha.busca ? [] : itensDisponiveis.filter(i =>
                      i.descricao.toLowerCase().includes(linha.busca.toLowerCase()) ||
                      i.codigo.toLowerCase().includes(linha.busca.toLowerCase())
                    ).slice(0, 10);

                    return (
                      <div key={idx} className="space-y-2 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="flex gap-2">
                          {/* Searchable Select */}
                          <div className="relative flex-1">
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={itemSelecionado ? `${itemSelecionado.codigo} — ${itemSelecionado.descricao}` : linha.busca}
                                readOnly={!!itemSelecionado}
                                onChange={e => setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, busca: e.target.value } : l))}
                                placeholder="Buscar item por código ou nome..."
                                className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {itemSelecionado && (
                                <button
                                  onClick={() => setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, item_id: '', busca: '' } : l))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-md text-slate-400"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>

                            {/* Sugestões */}
                            {!itemSelecionado && linha.busca && (
                              <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                {filtrados.length === 0 ? (
                                  <div className="p-3 text-[11px] text-slate-400 text-center italic">Nenhum item encontrado</div>
                                ) : (
                                  filtrados.map(i => (
                                    <button
                                      key={i.id}
                                      onClick={() => setLinhas(prev => prev.map((l, pIdx) => pIdx === idx ? { ...l, item_id: i.id, busca: '' } : l))}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-50 last:border-0"
                                    >
                                      <span className="font-semibold text-slate-700">{i.codigo}</span> — {i.descricao}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          <input type="number" min="0.001" step="0.001" placeholder="Qtd" value={linha.quantidade}
                            onChange={e => setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, quantidade: e.target.value } : l))}
                            className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          
                          {linhas.length > 1 && (
                            <button onClick={() => setLinhas(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => setLinhas(prev => [...prev, { item_id: '', quantidade: '', busca: '' }])}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium pt-1">
                    <Plus size={14} />Adicionar item
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Observação</label>
                <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalAberto(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={criar} disabled={salvando} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors">
                {salvando ? 'Enviando...' : 'Enviar Requisição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
