import { useEffect, useState } from 'react';
import { Building2, Plus, X, Phone, Mail, User, Search, Pencil, CheckCircle } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  categorias: string[] | null;
  observacao: string | null;
  ativo: boolean;
  criado_em: string;
}

const CATEGORIAS_OPCOES = ['Materiais', 'Ferramentas', 'EPI', 'Serviços', 'Outros'];

function formatCNPJ(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

const FORM_INICIAL = { nome: '', cnpj: '', contato_nome: '', contato_telefone: '', contato_email: '', categorias: [] as string[], observacao: '' };

export function Fornecedores() {
  const { usuario } = useAuth();
  const isGestor = ['gestor', 'admin', 'dono'].includes(usuario?.papel || '');
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [salvoId, setSalvoId] = useState<string | null>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fornecedores').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      setFornecedores(data || []);
    } catch (err) {
      console.error('[Fornecedores] erro ao carregar:', err);
      setFornecedores([]);
    } finally {
      setLoading(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_INICIAL);
    setModal(true);
  }

  function abrirEditar(f: Fornecedor) {
    setEditando(f);
    setForm({ nome: f.nome, cnpj: f.cnpj || '', contato_nome: f.contato_nome || '', contato_telefone: f.contato_telefone || '', contato_email: f.contato_email || '', categorias: f.categorias || [], observacao: f.observacao || '' });
    setModal(true);
  }

  function toggleCategoria(cat: string) {
    setForm(p => ({ ...p, categorias: p.categorias.includes(cat) ? p.categorias.filter(c => c !== cat) : [...p.categorias, cat] }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome,
        cnpj: form.cnpj || null,
        contato_nome: form.contato_nome || null,
        contato_telefone: form.contato_telefone || null,
        contato_email: form.contato_email || null,
        categorias: form.categorias.length ? form.categorias : null,
        observacao: form.observacao || null,
      };

      if (editando) {
        const { error } = await supabase.from('fornecedores').update(payload).eq('id', editando.id);
        if (error) throw error;
        setSalvoId(editando.id);
      } else {
        const { data, error } = await supabase.from('fornecedores').insert(payload).select().single();
        if (error) throw error;
        if (data) setSalvoId(data.id);
      }

      setModal(false);
      await carregar();
      setTimeout(() => setSalvoId(null), 3000);
    } catch (err) {
      console.error('[Fornecedores] erro ao salvar:', err);
    } finally {
      setSalvando(false);
    }
  }

  async function desativar(id: string) {
    if (!confirm('Remover este fornecedor?')) return;
    await supabase.from('fornecedores').update({ ativo: false }).eq('id', id);
    carregar();
  }

  const filtrados = fornecedores.filter(f => {
    if (!busca) return true;
    const t = busca.toLowerCase();
    return f.nome.toLowerCase().includes(t) || (f.cnpj || '').includes(t) || (f.contato_nome || '').toLowerCase().includes(t);
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="text-indigo-500" size={26} />
          Fornecedores
        </h1>
        <p className="text-sm text-slate-500 mt-1">Cadastro e gestao de fornecedores</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar fornecedor..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {isGestor && (
          <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Novo fornecedor
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Building2 size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum fornecedor encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtrados.map(f => (
            <div key={f.id} className={`bg-white border rounded-xl p-5 transition-all ${salvoId === f.id ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Building2 size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{f.nome}</p>
                    {f.cnpj && <p className="text-xs text-slate-400 font-mono">{formatCNPJ(f.cnpj)}</p>}
                  </div>
                </div>
                {salvoId === f.id && <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />}
                {isGestor && salvoId !== f.id && (
                  <div className="flex gap-1">
                    <button onClick={() => abrirEditar(f)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><Pencil size={14} /></button>
                    <button onClick={() => desativar(f.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"><X size={14} /></button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                {f.contato_nome && <p className="flex items-center gap-2 text-sm text-slate-600"><User size={13} className="text-slate-400" />{f.contato_nome}</p>}
                {f.contato_telefone && <p className="flex items-center gap-2 text-sm text-slate-600"><Phone size={13} className="text-slate-400" />{f.contato_telefone}</p>}
                {f.contato_email && <p className="flex items-center gap-2 text-sm text-slate-600"><Mail size={13} className="text-slate-400" />{f.contato_email}</p>}
              </div>

              {f.categorias?.length ? (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {f.categorias.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">{c}</span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-semibold">{editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Razão social ou nome fantasia"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">CNPJ</label>
                <input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Contato</label>
                  <input value={form.contato_nome} onChange={e => setForm(p => ({ ...p, contato_nome: e.target.value }))}
                    placeholder="Nome do contato"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Telefone</label>
                  <input value={form.contato_telefone} onChange={e => setForm(p => ({ ...p, contato_telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">E-mail</label>
                <input type="email" value={form.contato_email} onChange={e => setForm(p => ({ ...p, contato_email: e.target.value }))}
                  placeholder="contato@fornecedor.com.br"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-2">Categorias</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS_OPCOES.map(cat => (
                    <button key={cat} type="button" onClick={() => toggleCategoria(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${form.categorias.includes(cat) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 hover:border-indigo-400'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Observação</label>
                <textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={salvar} disabled={!form.nome || salvando}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

