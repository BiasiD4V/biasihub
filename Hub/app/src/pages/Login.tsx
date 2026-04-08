import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { acessoRepository } from '../infrastructure/supabase/acessoRepository';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const [modalCriar, setModalCriar] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');
  const [emailNovo, setEmailNovo] = useState('');
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);
  const [erroSolicitacao, setErroSolicitacao] = useState('');

  async function handleSolicitarAcesso(e: FormEvent) {
    e.preventDefault();
    setErroSolicitacao('');
    setEnviandoSolicitacao(true);
    const resultado = await acessoRepository.criarSolicitacao(nomeNovo, emailNovo);
    setEnviandoSolicitacao(false);
    if (resultado.sucesso) {
      setSolicitacaoEnviada(true);
    } else {
      setErroSolicitacao(resultado.erro ?? 'Erro ao enviar solicitação. Tente novamente.');
    }
  }

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    const resultado = await login(email, senha, rememberMe);
    setCarregando(false);
    if (resultado.sucesso) {
      navigate('/', { replace: true });
    } else {
      setErro(resultado.erro ?? 'Erro ao entrar.');
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── ESQUERDA: foto + identidade visual ── */}
      <div
        className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col"
        style={{ backgroundColor: '#233772' }}
      >
        {/* Foto de fundo */}
        <img
          src="/login-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity: 0.35 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        {/* Gradiente sobre a foto */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, rgba(35,55,114,0.75) 0%, rgba(35,55,114,0.55) 50%, rgba(15,25,60,0.85) 100%)',
          }}
        />

        {/* Conteúdo esquerdo */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <img src="/logo-branco.svg" alt="Biasi" className="h-10 w-auto" />

          {/* Texto central */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-0.5 w-10 rounded-full" style={{ backgroundColor: '#FFC82D' }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,200,45,0.8)' }}>
                Portal Corporativo
              </span>
            </div>
            <h2
              className="text-5xl font-black leading-tight text-white mb-4"
              style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.02em' }}
            >
              Engenharia<br />& Instalações
            </h2>
            <p className="text-white/60 text-base leading-relaxed max-w-xs">
              Plataforma integrada de gestão para obras, comercial e almoxarifado.
            </p>
          </div>

          {/* Rodapé esquerdo */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FFC82D' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Biasi Engenharia & Instalações Ltda
            </span>
          </div>
        </div>
      </div>

      {/* ── DIREITA: formulário de login ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-[360px]">

          {/* Logo mobile */}
          <div className="lg:hidden mb-10 text-center">
            <img src="/logo-biasi.svg" alt="Biasi" className="h-14 mx-auto" />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-3xl font-black"
              style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}
            >
              Bem-vindo
            </h1>
            <p className="text-slate-400 text-sm mt-1">Acesse o BiasíHub com suas credenciais</p>
          </div>

          {/* Erro */}
          {erro && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {erro}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@biasiengenharia.com.br"
                autoComplete="email"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all bg-slate-50 focus:bg-white"
                style={{ '--tw-ring-color': '#233772' } as any}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition-all bg-slate-50 focus:bg-white"
                  style={{ '--tw-ring-color': '#233772' } as any}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                style={{ accentColor: '#233772' }}
              />
              <label htmlFor="remember-me" className="text-sm text-slate-500 cursor-pointer">
                Lembrar de mim neste computador
              </label>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg"
              style={{
                backgroundColor: carregando ? '#4a6199' : '#233772',
                color: '#FFC82D',
                boxShadow: '0 8px 24px rgba(35,55,114,0.3)',
                fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={e => { if (!carregando) (e.currentTarget as HTMLElement).style.backgroundColor = '#1a2a5e' }}
              onMouseLeave={e => { if (!carregando) (e.currentTarget as HTMLElement).style.backgroundColor = '#233772' }}
            >
              {carregando ? (
                <>
                  <span className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                  Entrando...
                </>
              ) : 'ENTRAR'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-8">
            Não tem conta?{' '}
            <button
              onClick={() => { setModalCriar(true); setSolicitacaoEnviada(false); setNomeNovo(''); setEmailNovo(''); }}
              className="font-semibold hover:underline"
              style={{ color: '#233772' }}
            >
              Solicitar acesso
            </button>
          </p>
        </div>
      </div>

      {/* ── MODAL SOLICITAR ACESSO ── */}
      {modalCriar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
            <button onClick={() => setModalCriar(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>

            {solicitacaoEnviada ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: 'rgba(35,55,114,0.08)' }}>
                  <svg className="w-7 h-7" style={{ color: '#233772' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: '#233772' }}>Solicitação enviada!</h2>
                <p className="text-sm text-slate-500">
                  Sua solicitação foi enviada! Aguarde o administrador aprovar seu acesso.
                </p>
                <button
                  onClick={() => setModalCriar(false)}
                  className="mt-6 w-full font-bold py-2.5 rounded-xl text-sm transition-colors"
                  style={{ backgroundColor: '#233772', color: '#FFC82D' }}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-black" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
                    Solicitar acesso
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Preencha seus dados e um administrador aprovará sua solicitação.</p>
                </div>

                {erroSolicitacao && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                    {erroSolicitacao}
                  </div>
                )}

                <form onSubmit={handleSolicitarAcesso} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nome completo</label>
                    <input type="text" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)}
                      placeholder="Seu nome completo" required
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-slate-50 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
                    <input type="email" value={emailNovo} onChange={(e) => setEmailNovo(e.target.value)}
                      placeholder="seu@email.com.br" required
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-slate-50 focus:bg-white transition-all" />
                  </div>
                  <button
                    type="submit"
                    disabled={enviandoSolicitacao}
                    className="w-full font-bold py-3 rounded-xl text-sm transition-colors mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#233772', color: '#FFC82D', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {enviandoSolicitacao ? (
                      <>
                        <span className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : 'Enviar solicitação'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
