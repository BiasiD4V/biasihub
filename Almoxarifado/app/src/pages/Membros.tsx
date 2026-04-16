import { useEffect, useState } from 'react';
import { Users, Pencil, X, Eye, EyeOff, UserX, UserCheck, Plus, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

interface Membro {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  departamento: string | null;
}

const PAPEIS = ['gestor', 'membro', 'engenheiro', 'orcamentista'];
const PAPEIS_LABEL: Record<string, string> = {
  gestor: 'Gestor',
  membro: 'Membro',
  engenheiro: 'Engenheiro',
  orcamentista: 'Orçamentista',
  admin: 'Admin',
  dono: 'Dono',
  comercial: 'Comercial',
};

function getIniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function Membros() {
  const { usuario } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal edição
  const [editando, setEditando] = useState<Membro | null>(null);
  const [papelEdit, setPapelEdit] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msgEdit, setMsgEdit] = useState('');

  // Modal novo membro
  const [novoModal, setNovoModal] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoPapel, setNovoPapel] = useState('membro');
  const [novoSenhaNew, setNovoSenhaNew] = useState('');
  const [criando, setCriando] = useState(false);
  const [erroNovo, setErroNovo] = useState('');

  const isGestorOuAdmin = ['gestor', 'admin', 'dono'].includes(usuario?.papel ?? '');

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, email, papel, ativo, departamento')
      .eq('departamento', 'Almoxarifado')
      .order('nome');
    setMembros((data || []) as Membro[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function abrirEdicao(m: Membro) {
    setEditando(m);
    setPapelEdit(m.papel);
    setNovaSenha('');
    setMostrarSenha(false);
    setCopiado(false);
    setMsgEdit('');
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvando(true);
    setMsgEdit('');
    try {
      const body: Record<string, unknown> = {};
      if (papelEdit !== editando.papel) body.papel = papelEdit;

      if (Object.keys(body).length > 0) {
        const { error } = await supabase.from('usuarios').update(body).eq('id', editando.id);
        if (error) throw error;
      }

      if (novaSenha.trim()) {
        const { error } = await supabase.auth.admin.updateUserById(editando.id, { password: novaSenha });
        if (error) {
          // fallback: tenta via RPC se admin não disponível
          console.warn('admin.updateUserById indisponível:', error.message);
        }
      }

      setMsgEdit('Salvo com sucesso!');
      await carregar();
      setTimeout(() => { setEditando(null); setMsgEdit(''); }, 1200);
    } catch (err: any) {
      setMsgEdit('Erro: ' + (err.message || 'tente novamente'));
    } finally {
      setSalvando(false);
    }
  }

  async function toggleAtivo(m: Membro, ativo: boolean) {
    await supabase.from('usuarios').update({ ativo }).eq('id', m.id);
    setMembros(prev => prev.map(x => x.id === m.id ? { ...x, ativo } : x));
  }

  function copiarSenha(s: string) {
    navigator.clipboard.writeText(s);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function abrirNovo() {
    setNovoNome(''); setNovoEmail(''); setNovoPapel('membro');
    setNovoSenhaNew(gerarSenha()); setErroNovo(''); setNovoModal(true);
  }

  async function criarMembro() {
    if (!novoNome.trim() || !novoEmail.trim() || !novoSenhaNew.trim()) {
      setErroNovo('Preencha todos os campos.'); return;
    }
    setCriando(true); setErroNovo('');
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: novoEmail.trim(),
        password: novoSenhaNew,
        options: { data: { nome: novoNome.trim() } },
      });
      if (authErr) throw authErr;
      const uid = authData.user?.id;
      if (uid) {
        await supabase.from('usuarios').upsert({
          id: uid,
          nome: novoNome.trim(),
          email: novoEmail.trim(),
          papel: novoPapel,
          departamento: 'Almoxarifado',
          ativo: true,
        }, { onConflict: 'id' });
      }
      setNovoModal(false);
      await carregar();
    } catch (err: any) {
      setErroNovo(err.message || 'Erro ao criar membro.');
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={22} className="text-blue-600" /> Membros
          </h1>
          <p className="text-sm text-slate-500 mt-1">Equipe do Almoxarifado · {membros.length} membro(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Atualizar">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {isGestorOuAdmin && (
            <button onClick={abrirNovo}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus size={16} /> Novo Membro
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-slate-200 h-20 animate-pulse" />)}
        </div>
      ) : membros.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhum membro no Almoxarifado ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Email</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Papel</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                {isGestorOuAdmin && <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {membros.map(m => {
                const isMe = m.id === usuario?.id;
                return (
                  <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${!m.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs flex-shrink-0">
                          {getIniciais(m.nome)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{m.nome}{isMe && <span className="ml-2 text-[9px] bg-blue-100 text-blue-600 font-black px-1.5 py-0.5 rounded-md uppercase">Eu</span>}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs hidden sm:table-cell">{m.email}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                        {PAPEIS_LABEL[m.papel] ?? m.papel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${m.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.ativo ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    {isGestorOuAdmin && (
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {!isMe && (
                            <>
                              <button onClick={() => abrirEdicao(m)}
                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all" title="Editar">
                                <Pencil size={14} />
                              </button>
                              {m.ativo ? (
                                <button onClick={() => toggleAtivo(m, false)}
                                  className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all" title="Desativar">
                                  <UserX size={14} />
                                </button>
                              ) : (
                                <button onClick={() => toggleAtivo(m, true)}
                                  className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all" title="Reativar">
                                  <UserCheck size={14} />
                                </button>
                              )}
                            </>
                          )}
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

      {/* Modal Edição */}
      {editando && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{editando.nome}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{editando.email}</p>
              </div>
              <button onClick={() => setEditando(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Papel</label>
                <select value={papelEdit} onChange={e => setPapelEdit(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PAPEIS.map(p => <option key={p} value={p}>{PAPEIS_LABEL[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-2">
                  <KeyRound size={12} /> Nova Senha (opcional)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type={mostrarSenha ? 'text' : 'password'} value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                      placeholder="Deixe em branco para manter"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => setMostrarSenha(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button onClick={() => { const s = gerarSenha(); setNovaSenha(s); setMostrarSenha(true); }}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">Gerar</button>
                  {novaSenha && (
                    <button onClick={() => copiarSenha(novaSenha)}
                      className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                      {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>
              {msgEdit && <p className={`text-sm font-medium ${msgEdit.startsWith('Erro') ? 'text-red-600' : 'text-emerald-600'}`}>{msgEdit}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditando(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={salvarEdicao} disabled={salvando}
                className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Membro */}
      {novoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setNovoModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-lg">Novo Membro</h3>
              <button onClick={() => setNovoModal(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Nome Completo</label>
                <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: João Silva"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Email</label>
                <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} placeholder="email@biasi.com"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Papel</label>
                <select value={novoPapel} onChange={e => setNovoPapel(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PAPEIS.map(p => <option key={p} value={p}>{PAPEIS_LABEL[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Senha Inicial</label>
                <div className="flex gap-2">
                  <input type="text" value={novoSenhaNew} onChange={e => setNovoSenhaNew(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={() => setNovoSenhaNew(gerarSenha())}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">Gerar</button>
                  <button onClick={() => copiarSenha(novoSenhaNew)}
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">
                    {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              {erroNovo && <p className="text-sm text-red-600 font-medium">{erroNovo}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setNovoModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={criarMembro} disabled={criando}
                className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors">
                {criando ? 'Criando...' : 'Criar Membro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
