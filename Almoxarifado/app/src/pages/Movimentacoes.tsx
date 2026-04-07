import { useEffect, useState } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, X, ArrowLeftRight } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import type { Movimentacao } from '../domain/entities/Movimentacao';
import type { ItemAlmoxarifado } from '../domain/entities/ItemAlmoxarifado';
import { useAuth } from '../context/AuthContext';

export function Movimentacoes() {
  const { usuario } = useAuth();
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [itens, setItens] = useState<ItemAlmoxarifado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ item_id: '', tipo: 'entrada' as 'entrada' | 'saida', quantidade: '', obra: '', observacao: '', data: new Date().toISOString().split('T')[0] });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    const [movsRes, itensRes] = await Promise.all([
      supabase.from('movimentacoes_almoxarifado')
        .select('*, item:itens_almoxarifado(codigo,descricao,unidade), responsavel:usuarios(nome)')
        .order('criado_em', { ascending: false })
        .limit(200),
      supabase.from('itens_almoxarifado').select('id,codigo,descricao,unidade').eq('ativo', true).order('descricao'),
    ]);
    setMovs((movsRes.data || []) as unknown as Movimentacao[]);
    setItens((itensRes.data || []) as unknown as ItemAlmoxarifado[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function registrar() {
    if (!form.item_id || !form.quantidade || Number(form.quantidade) <= 0) {
      setErro('Selecione o item e informe a quantidade'); return;
    }
    setSalvando(true); setErro('');

    const { error } = await supabase.from('movimentacoes_almoxarifado').insert({
      item_id: form.item_id,
      tipo: form.tipo,
      quantidade: parseFloat(form.quantidade),
      obra: form.obra.trim() || null,
      observacao: form.observacao.trim() || null,
      data: form.data,
      responsavel_id: usuario!.id,
    });

    if (error) { setErro(error.message); setSalvando(false); return; }
    await carregar();
    setModalAberto(false);
    setSalvando(false);
    setForm({ item_id: '', tipo: 'entrada', quantidade: '', obra: '', observacao: '', data: new Date().toISOString().split('T')[0] });
  }

  const filtrados = movs.filter(m => {
    const matchBusca = !busca || (m.item as unknown as {descricao:string})?.descricao?.toLowerCase().includes(busca.toLowerCase()) || m.obra?.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || m.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  const formatData = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Movimentações</h1>
          <p className="text-sm text-slate-500 mt-1">Entradas e saídas de materiais</p>
        </div>
        <button onClick={() => { setModalAberto(true); setErro(''); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus size={16} />Registrar
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por item ou obra..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          {(['todos', 'entrada', 'saida'] as const).map(f => (
            <button key={f} onClick={() => setFiltroTipo(f)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${filtroTipo === f ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {f === 'todos' ? 'Todos' : f === 'entrada' ? '↑ Entrada' : '↓ Saída'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowLeftRight size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Data</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Item</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Qtd</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Obra</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(m => {
                  const itemData = m.item as unknown as { codigo: string; descricao: string; unidade: string };
                  const responsavelData = m.responsavel as unknown as { nome: string };
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-500">{formatData(m.data)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${m.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {m.tipo === 'entrada' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-700 text-xs">{itemData?.descricao}</p>
                        <p className="text-[10px] text-slate-400">{itemData?.codigo}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-700">
                        {Number(m.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {itemData?.unidade}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 hidden md:table-cell">{m.obra || '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-500 hidden lg:table-cell">{responsavelData?.nome || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalAberto(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Registrar Movimentação</h3>
              <button onClick={() => setModalAberto(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-3">
                {(['entrada', 'saida'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${form.tipo === t ? (t === 'entrada' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {t === 'entrada' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {t === 'entrada' ? 'Entrada' : 'Saída'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Item *</label>
                <select value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione um item...</option>
                  {itens.map(i => <option key={i.id} value={i.id}>{i.codigo} — {i.descricao}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Quantidade *</label>
                  <input type="number" min="0.001" step="0.001" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Obra / Destino</label>
                <input value={form.obra} onChange={e => setForm(f => ({ ...f, obra: e.target.value }))} placeholder="Nome da obra ou destino"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Observação</label>
                <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2} placeholder="Observações opcionais..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalAberto(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={registrar} disabled={salvando} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors">
                {salvando ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
