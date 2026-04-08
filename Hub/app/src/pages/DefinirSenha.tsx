import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function DefinirSenha() {
  const { usuario, definirSenha } = useAuth();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }

    setSalvando(true);
    const resultado = await definirSenha(senha);
    setSalvando(false);

    if (!resultado.sucesso) {
      setErro(resultado.erro ?? 'Erro ao salvar senha.');
    }
    // Se sucesso, o AuthContext atualiza precisaDefinirSenha → App redireciona automaticamente
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[400px]">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">

          {/* Ícone */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'rgba(35,55,114,0.08)' }}
          >
            <ShieldCheck size={28} style={{ color: '#233772' }} />
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-black mb-2"
              style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}
            >
              Bem-vindo, {usuario?.nome?.split(' ')[0]}!
            </h1>
            <p className="text-sm text-slate-500">
              Para finalizar seu acesso, escolha uma senha para entrar no BiasíHub.
            </p>
          </div>

          {erro && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 bg-slate-50 focus:bg-white transition-all"
                  style={{ '--tw-ring-color': '#233772' } as any}
                />
                <button
                  type="button"
                  onClick={() => setMostrar(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Confirmar senha
              </label>
              <input
                type={mostrar ? 'text' : 'password'}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-slate-50 focus:bg-white transition-all"
                style={{ '--tw-ring-color': '#233772' } as any}
              />
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg disabled:opacity-60"
              style={{
                backgroundColor: '#233772',
                color: '#FFC82D',
                fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '0.05em',
              }}
            >
              {salvando ? (
                <>
                  <span className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                  Salvando...
                </>
              ) : 'DEFINIR SENHA'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Biasi Engenharia & Instalações
        </p>
      </div>
    </div>
  );
}
