import { useEffect, useState } from 'react';
import { Users, Shield, ShieldCheck, HardHat, Circle, Pencil, Eye, EyeOff, KeyRound, X, Copy, Check } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface Membro {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  criado_em: string;
}

const ICONE_PAPEL: Record<string, React.ElementType> = {
  admin: ShieldCheck,
  gestor: Shield,
  orcamentista: HardHat,
};

const COR_PAPEL: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  gestor: 'bg-purple-50 text-purple-700 border-purple-200',
  orcamentista: 'bg-blue-50 text-blue-700 border-blue-200',
};

const ROTULO_PAPEL: Record<string, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  orcamentista: 'Orçamentista',
  user: 'Usuário',
  usuario: 'Usuário',
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function Membros() {
  const { usuario } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de edição
  const [editando, setEditando] = useState<Membro | null>(null);
  const [papelSelecionado, setPapelSelecionado] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [senhaCopiada, setSenhaCopiada] = useState(false);

  // Só admin pode ver
  if (usuario?.papel !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  function abrirEdicao(m: Membro) {
    setEditando(m);
    setPapelSelecionado(m.papel);
    setNovaSenha('');
    setMostrarSenha(false);
    setMensagem(null);
    setSenhaCopiada(false);
  }

  function fecharModal() {
    setEditando(null);
    setMensagem(null);
  }

  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let senha = '';
    for (let i = 0; i < 10; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNovaSenha(senha);
    setMostrarSenha(true);
  }

  async function copiarSenha() {
    if (novaSenha) {
      await navigator.clipboard.writeText(novaSenha);
      setSenhaCopiada(true);
      setTimeout(() => setSenhaCopiada(false), 2000);
    }
  }

  async function salvarAlteracoes() {
    if (!editando) return;
    setSalvando(true);
    setMensagem(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMensagem({ tipo: 'erro', texto: 'Sessão expirada' });
        setSalvando(false);
        return;
      }

      const body: Record<string, string> = { userId: editando.id };
      
      if (papelSelecionado !== editando.papel) {
        body.papel = papelSelecionado;
      }
      if (novaSenha.trim()) {
        body.novaSenha = novaSenha.trim();
      }

      if (!body.papel && !body.novaSenha) {
        setMensagem({ tipo: 'erro', texto: 'Nenhuma alteração para salvar' });
        setSalvando(false);
        return;
      }

      const response = await fetch('/api/membros-update', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        // Atualizar lista local
        setMembros(prev => prev.map(m => 
          m.id === editando.id 
            ? { ...m, papel: body.papel || m.papel } 
            : m
        ));

        const msgs = [];
        if (result.papel) msgs.push(`Papel alterado para ${ROTULO_PAPEL[result.papel] || result.papel}`);
        if (result.senhaRedefinida) msgs.push('Senha redefinida com sucesso');
        setMensagem({ tipo: 'sucesso', texto: msgs.join('. ') });
      } else {
        setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao salvar' });
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão' });
    }
    setSalvando(false);
  }

  useEffect(() => {
    async function carregarMembros() {
      try {
        // Usar API serverless que faz bypass do RLS
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/membros', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMembros(data as Membro[]);
        }
      } catch (err) {
        console.error('Erro ao carregar membros:', err);
      }
      setLoading(false);
    }
    carregarMembros();
  }, []);

  const totalAtivos = membros.filter(m => m.ativo).length;
  const porPapel = membros.reduce<Record<string, number>>((acc, m) => {
    acc[m.papel] = (acc[m.papel] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Membros</h1>
        <p className="text-sm text-slate-500 mt-1">Usuários cadastrados no sistema</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-lg p-2.5">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{membros.length}</p>
              <p className="text-xs text-slate-500">Total de membros</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-lg p-2.5">
              <Circle size={20} className="text-green-600 fill-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalAtivos}</p>
              <p className="text-xs text-slate-500">Ativos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 flex-wrap gap-y-1">
            {Object.entries(porPapel).map(([papel, qtd]) => (
              <span key={papel} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${COR_PAPEL[papel] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {ROTULO_PAPEL[papel] || papel}: {qtd}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando membros...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Membro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">E-mail</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Papel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Desde</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {membros.map((m) => {
                const Icone = ICONE_PAPEL[m.papel] || Users;
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {m.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-slate-700">{m.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{m.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${COR_PAPEL[m.papel] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        <Icone size={12} />
                        {ROTULO_PAPEL[m.papel] || m.papel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${m.ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.ativo ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatarData(m.criado_em)}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => abrirEdicao(m)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar membro"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Edição */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={fecharModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {editando.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{editando.nome}</h3>
                  <p className="text-xs text-slate-500">{editando.email}</p>
                </div>
              </div>
              <button onClick={fecharModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Alterar Papel */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Função / Papel</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'gestor', 'orcamentista'] as const).map((p) => {
                    const Icone = ICONE_PAPEL[p] || Users;
                    const selecionado = papelSelecionado === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPapelSelecionado(p)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm ${
                          selecionado
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Icone size={18} />
                        <span className="font-medium text-xs">{ROTULO_PAPEL[p]}</span>
                      </button>
                    );
                  })}
                </div>
                {papelSelecionado !== editando.papel && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Papel será alterado de {ROTULO_PAPEL[editando.papel]} → {ROTULO_PAPEL[papelSelecionado]}
                  </p>
                )}
              </div>

              {/* Redefinir Senha */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <KeyRound size={14} className="inline mr-1.5" />
                  Redefinir Senha
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      placeholder="Nova senha (deixe vazio para não alterar)"
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      className="w-full px-3 py-2.5 pr-20 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                      {novaSenha && (
                        <button
                          onClick={copiarSenha}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-600"
                          title="Copiar senha"
                        >
                          {senhaCopiada ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      )}
                      <button
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-600"
                      >
                        {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={gerarSenha}
                    className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
                  >
                    Gerar
                  </button>
                </div>
                {novaSenha && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    ⚠ Anote a senha antes de salvar — ela não poderá ser recuperada depois.
                  </p>
                )}
              </div>

              {/* Mensagem de feedback */}
              {mensagem && (
                <div className={`text-sm px-4 py-3 rounded-lg ${
                  mensagem.tipo === 'sucesso' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {mensagem.texto}
                </div>
              )}
            </div>

            {/* Footer do modal */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button
                onClick={fecharModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAlteracoes}
                disabled={salvando}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
