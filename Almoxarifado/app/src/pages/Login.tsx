import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const resultado = await login(email, senha, rememberMe);

    setCarregando(false);
    if (resultado.sucesso) {
      navigate('/dashboard', { replace: true });
      return;
    }

    setErro(resultado.erro ?? 'Credenciais invalidas.');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08122f] p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-[#1B47A1]/45 blur-[120px]" />
        <div className="absolute -bottom-24 -right-28 h-80 w-80 rounded-full bg-[#FFC82D]/20 blur-[120px]" />
      </div>

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[34px] border border-[#3A5FA9] shadow-[0_32px_80px_rgba(0,0,0,0.45)] lg:grid-cols-2">
        <div className="flex flex-col justify-between bg-[#233772] p-10 lg:p-14">
          <div>
            <img src="/logo-branco.svg" alt="Biasi" className="h-10 w-auto" />
            <div className="mt-11 inline-flex items-center rounded-full border border-[#FFD76E]/40 bg-[#FFC82D]/10 px-4 py-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#FFD76E]">Almoxarifado</span>
            </div>
            <h1 className="mt-7 max-w-md text-5xl font-black leading-[1.02] text-white">
              Gestao de estoque com ritmo de obra.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#DCE7FF]">
              Controle de requisicoes, movimentacoes e frota no mesmo padrao visual do Hub.
            </p>
          </div>

          <div className="border-t border-[#3D5EA8] pt-10">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FFD76E]">
              Biasi Engenharia - Terminal Almox
            </p>
          </div>
        </div>

        <div className="bg-white p-8 sm:p-12 lg:p-14">
          <div className="mx-auto max-w-md">
            <h2 className="text-4xl font-black leading-none text-[#233772]">Bem-vindo</h2>
            <p className="mt-2 text-sm text-[#4B5D89]">Entre com suas credenciais para continuar.</p>

            {erro && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[#4B5D89]">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@biasiengenharia.com.br"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-[#C8D5F2] bg-white px-4 text-[#233772] focus:outline-none focus:ring-2 focus:ring-[#233772]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[#4B5D89]">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-[#C8D5F2] bg-white px-4 pr-12 text-[#233772] focus:outline-none focus:ring-2 focus:ring-[#233772]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5D89] hover:text-[#233772]"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-[#4B5D89]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#C8D5F2] text-[#233772]"
                />
                Lembrar de mim
              </label>

              <button
                type="submit"
                disabled={carregando}
                className="h-12 w-full rounded-xl bg-[#233772] text-[#FFC82D] font-black uppercase tracking-[0.2em] transition hover:bg-[#1D2E5F] disabled:opacity-60"
              >
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
