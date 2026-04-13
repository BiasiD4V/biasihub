import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PCOAutoCarousel from '../components/PCOAutoCarousel';

function IconeMicrosoft() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function Login() {
  const { login, loginComMicrosoft, carregando, erro } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [mostrarFormEmail, setMostrarFormEmail] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const ok = await login(email, senha);
      if (ok) navigate('/');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoginLoading(true);
    await loginComMicrosoft();
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#08122f]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-36 -top-28 h-[30rem] w-[30rem] rounded-full bg-[#2F6FE7]/35 blur-[130px]" />
        <div className="absolute -bottom-24 -right-20 h-[24rem] w-[24rem] rounded-full bg-[#FFC82D]/20 blur-[120px]" />
      </div>

      <div className="hidden lg:flex lg:w-1/2">
        <div className="relative z-10 flex w-full flex-col justify-between border-r border-[#31549A] bg-[#233772]/90 p-12">
          <div>
            <img src="/logo-branco.svg" alt="Biasi Engenharia" className="h-12 w-auto" />
            <div className="mt-10 inline-flex items-center rounded-full border border-[#FFD76E]/40 bg-[#FFC82D]/12 px-4 py-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FFD76E]">ERP Obras</span>
            </div>
            <h1 className="mt-6 max-w-lg text-5xl font-black leading-[1.02] text-white">
              Planejamento e controle de obras em tempo real.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#DCE8FF]">
              Fluxo de obra, medicao, cronograma e custos no mesmo visual premium do Hub.
            </p>
          </div>

          <div className="rounded-3xl border border-[#3A5FA9] bg-[#142B5C]/70 p-5">
            <PCOAutoCarousel />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md rounded-[30px] border border-[#3B60A8] bg-white p-8 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
          <div className="mb-7 text-center lg:hidden">
            <img src="/logo-colorido.svg" alt="Biasi" className="mx-auto h-10 w-auto" />
          </div>

          <h2 className="text-4xl font-black leading-none text-[#233772]">Bem-vindo</h2>
          <p className="mt-2 text-sm text-[#4B5D89]">
            Acesse com sua conta Microsoft @biasiengenharia.com.br
          </p>

          {erro && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              <strong>Erro:</strong> {erro}
            </div>
          )}

          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={carregando || loginLoading}
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#CBD9F6] bg-white px-4 text-sm font-semibold text-[#233772] transition-all hover:border-[#233772] hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <IconeMicrosoft />
            {loginLoading ? 'Conectando...' : 'Entrar com Microsoft 365'}
          </button>

          <div className="mt-5 rounded-xl border border-[#F2D177] bg-[#FFF8DF] px-4 py-3 text-xs text-[#8B6513]">
            <p className="mb-1 font-semibold">Primeiro acesso?</p>
            <p>
              Entre com sua conta Biasi. A liberacao acontece apos analise do administrador.
            </p>
          </div>

          {!mostrarFormEmail && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMostrarFormEmail(true)}
                className="text-xs font-semibold text-[#5C73A8] transition-colors hover:text-[#233772]"
              >
                Ou use email + senha
              </button>
            </div>
          )}

          {mostrarFormEmail && (
            <>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-[#4B5D89]">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@biasiengenharia.com.br"
                    required
                    className="h-11 w-full rounded-xl border border-[#C8D5F2] px-3 text-sm text-[#233772] outline-none focus:ring-2 focus:ring-[#233772]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-[#4B5D89]">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••"
                      required
                      className="h-11 w-full rounded-xl border border-[#C8D5F2] px-3 pr-10 text-sm text-[#233772] outline-none focus:ring-2 focus:ring-[#233772]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A7FAA] hover:text-[#233772]"
                    >
                      {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading || carregando || !email || !senha}
                  className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#233772] text-sm font-black uppercase tracking-[0.17em] text-[#FFC82D] transition-colors hover:bg-[#1D2E5F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loginLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      Entrar
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setMostrarFormEmail(false)}
                className="mt-4 w-full text-xs font-semibold text-[#5C73A8] transition-colors hover:text-[#233772]"
              >
                Voltar ao Microsoft
              </button>
            </>
          )}

          {!mostrarFormEmail && (
            <p className="mt-8 text-center text-[11px] text-[#7A8BAF]">
              © {new Date().getFullYear()} Biasi Engenharia e Instalacoes · Sistema interno
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
