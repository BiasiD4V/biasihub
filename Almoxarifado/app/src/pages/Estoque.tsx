import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, AlertTriangle, X, Package } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import type { ItemAlmoxarifado } from '../domain/entities/ItemAlmoxarifado';
import { useAuth } from '../context/AuthContext';

const UNIDADES = ['un', 'kg', 'g', 'L', 'ml', 'm', 'm²', 'm³', 'cx', 'pç', 'par', 'rolo', 'saco', 'balde'];

export function Estoque() {
  const { usuario } = useAuth();
  const [itens, setItens] = useState<ItemAlmoxarifado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'baixo' | 'ok'>('todos');

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ItemAlmoxarifado | null>(null);
  const [form, setForm] = useState({ codigo: '', descricao: '', unidade: 'un', estoque_minimo: '', localizacao: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const isGestor = usuario?.papel === 'gestor' || usuario?.papel === 'admin' || usuario?.papel === 'dono';

  async function carregar() {
    const { data } = await supabase.from('itens_almoxarifado').select('*').eq('ativo', true).order('descricao');
    setItens(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({ codigo: '', descricao: '', unidade: 'un', estoque_minimo: '', localizacao: '' });
    setErro('');
    setModalAberto(true);
  }

  function abrirEdicao(item: ItemAlmoxarifado) {
    setEditando(item);
    setForm({ codigo: item.codigo, descricao: item.descricao, unidade: item.unidade, estoque_minimo: String(item.estoque_minimo), localizacao: item.localizacao || '' });
    setErro('');
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.descricao.trim()) { setErro('Código e descrição são obrigatórios'); return; }
    setSalvando(true);
    setErro('');

    const payload = {
      codigo: form.codigo.trim().toUpperCase(),
      descricao: form.descricao.trim(),
      unidade: form.unidade,
      estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      localizacao: form.localizacao.trim() || null,
    };

    let error;
    if (editando) {
      const res = await supabase.from('itens_almoxarifado').update(payload).eq('id', editando.id);
      error = res.error;
    } else {
      const res = await supabase.from('itens_almoxarifado').insert({ ...payload, estoque_atual: 0 });
      error = res.error;
    }

    if (error) { setErro(error.message); setSalvando(false); return; }
    await carregar();
    setModalAberto(false);
    setSalvando(false);
  }

  async function desativar(id: string) {
    await supabase.from('itens_almoxarifado').update({ ativo: false }).eq('id', id);
    setItens(prev => prev.filter(i => i.id !== id));
  }

  const filtrados = itens.filter(item => {
    const matchBusca = !busca || item.descricao.toLowerCase().includes(busca.toLowerCase()) || item.codigo.toLowerCase().includes(busca.toLowerCase());
    const isBaixo = item.estoque_atual < item.estoque_minimo;
    const matchStatus = filtroStatus === 'todos' || (filtroStatus === 'baixo' && isBaixo) || (filtroStatus === 'ok' && !isBaixo);
    return matchBusca && matchStatus;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque</h1>
          <p className="text-sm text-slate-500 mt-1">{itens.length} itens cadastrados</p>
        </div>
        {isGestor && (
          <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={16} />Novo Item
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código ou descrição..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          {(['todos', 'ok', 'baixo'] as const).map(f => (
            <button key={f} onClick={() => setFiltroStatus(f)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${filtroStatus === f ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {f === 'todos' ? 'Todos' : f === 'ok' ? 'OK' : '⚠ Baixo'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Código</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Descrição</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Local</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Atual</th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Mínimo</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  {isGestor && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(item => {
                  const baixo = item.estoque_atual < item.estoque_minimo;
                  return (
                    <tr key={item.id} className={`transition-colors hover:bg-slate-50/50 ${baixo ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{item.codigo}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-700">{item.descricao}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{item.localizacao || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${baixo ? 'text-amber-600' : 'text-slate-700'}`}>
                          {Number(item.estoque_atual).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {item.unidade}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-slate-500">
                        {Number(item.estoque_minimo).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {item.unidade}
                      </td>
                      <td className="px-5 py-3">
                        {baixo ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                            <AlertTriangle size={10} />Baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">OK</span>
                        )}
                      </td>
                      {isGestor && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => abrirEdicao(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => desativar(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><X size={14} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalAberto(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editando ? 'Editar Item' : 'Novo Item'}</h3>
              <button onClick={() => setModalAberto(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Código *</label>
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="EX: MAT-001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Unidade</label>
                  <select value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Descrição *</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Nome completo do item"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Estoque Mínimo</label>
                  <input type="number" min="0" step="0.001" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Localização</label>
                  <input value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} placeholder="Prateleira A1"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalAberto(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
