import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { acessoRepository } from '../infrastructure/supabase/acessoRepository';
import { motion, AnimatePresence } from 'framer-motion';

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
      return;
    }

    setErro(resultado.erro ?? 'Credenciais inválidas.');
  }

  async function handleSolicitarAcesso(e: FormEvent) {
    e.preventDefault();
    setErroSolicitacao('');
    setEnviandoSolicitacao(true);

    const resultado = await acessoRepository.criarSolicitacao(nomeNovo, emailNovo);

    setEnviandoSolicitacao(false);
    if (resultado.sucesso) {
      setSolicitacaoEnviada(true);
      return;
    }

    setErroSolicitacao(resultado.erro ?? 'Erro ao enviar solicitação.');
  }

  return (
    <div className="min-h-screen bg-[#0A1433] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-20 w-[36rem] h-[36rem] bg-[#233772] rounded-full blur-[120px] opacity-70" />
        <div className="absolute -bottom-24 -right-20 w-[32rem] h-[32rem] bg-[#1A2A55] rounded-full blur-[120px] opacity-70" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-[36px] border border-[#3D5EA8] shadow-[0_40px_100px_rgba(0,0,0,0.45)]"
      >
        <div className="bg-[#233772] p-10 lg:p-14 flex flex-col justify-between">
          <div>
            <img src="/logo-branco.svg" alt="Biasi" className="h-10 w-auto" />
            <div className="mt-12 inline-flex items-center rounded-full border border-[#FFD76E]/40 bg-[#FFC82D]/10 px-4 py-1.5">
              <span className="text-[#FFD76E] text-[10px] font-black uppercase tracking-[0.24em]">Portal corporativo</span>
            </div>
            <h1 className="mt-6 text-white text-5xl leading-[1.05] font-black max-w-md">Engenharia e instalações com controle total.</h1>
            <p className="mt-6 text-[#D9E4FF] text-base max-w-md leading-relaxed">
              Acesse o ecossistema BiasiHub para operar Comercial, Almoxarifado e Obras com segurança e performance.
            </p>
          </div>

          <div className="pt-10 border-t border-[#3D5EA8]">
            <p className="text-[#FFD76E] text-[10px] font-black uppercase tracking-[0.22em]">Biasi Engenharia</p>
          </div>
        </div>

        <div className="bg-white p-8 sm:p-12 lg:p-14">
          <div className="max-w-md mx-auto">
            <h2 className="text-[#233772] text-4xl font-black leading-none">Bem-vindo</h2>
            <p className="mt-2 text-[#4B5D89] text-sm">Entre com suas credenciais para continuar.</p>

            {erro && (
              <div className="mt-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#4B5D89] mb-2">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@biasiengenharia.com.br"
                  className="w-full h-12 rounded-xl border border-[#C8D5F2] px-4 text-[#233772] bg-white focus:outline-none focus:ring-2 focus:ring-[#233772]/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#4B5D89] mb-2">Senha</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-12 rounded-xl border border-[#C8D5F2] px-4 pr-12 text-[#233772] bg-white focus:outline-none focus:ring-2 focus:ring-[#233772]/20"
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#4B5D89]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#C8D5F2] text-[#233772]"
                  />
                  Lembrar de mim
                </label>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full h-12 rounded-xl bg-[#233772] text-[#FFC82D] font-black uppercase tracking-[0.2em] hover:bg-[#1D2E5F] transition disabled:opacity-60"
              >
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="mt-8 text-sm text-[#4B5D89] text-center">
              Não tem conta?{' '}
              <button
                onClick={() => {
                  setModalCriar(true);
                  setSolicitacaoEnviada(false);
                  setErroSolicitacao('');
                }}
                className="font-black text-[#233772] hover:text-[#1D2E5F]"
              >
                Solicitar acesso
              </button>
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {modalCriar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0B1230]/70 backdrop-blur-sm"
              onClick={() => setModalCriar(false)}
            />

            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 24 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <button onClick={() => setModalCriar(false)} className="absolute top-5 right-5 text-[#4B5D89] hover:text-[#233772]">
                <X size={20} />
              </button>

              <h3 className="text-2xl font-black text-[#233772]">Solicitar acesso</h3>
              <p className="mt-2 text-sm text-[#4B5D89]">Seu cadastro fica pendente até aprovação do admin.</p>

              {solicitacaoEnviada ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#233772] text-[#FFC82D] mx-auto flex items-center justify-center mb-4">
                    <ShieldCheck size={22} />
                  </div>
                  <p className="text-[#233772] font-semibold">Solicitação enviada com sucesso.</p>
                  <button onClick={() => setModalCriar(false)} className="mt-6 w-full h-11 rounded-xl bg-[#233772] text-[#FFC82D] font-black uppercase tracking-[0.15em]">
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSolicitarAcesso} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#4B5D89] mb-2">Nome</label>
                    <input
                      type="text"
                      value={nomeNovo}
                      onChange={(e) => setNomeNovo(e.target.value)}
                      required
                      className="w-full h-11 rounded-xl border border-[#C8D5F2] px-4 text-[#233772] focus:outline-none focus:ring-2 focus:ring-[#233772]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#4B5D89] mb-2">E-mail</label>
                    <input
                      type="email"
                      value={emailNovo}
                      onChange={(e) => setEmailNovo(e.target.value)}
                      required
                      className="w-full h-11 rounded-xl border border-[#C8D5F2] px-4 text-[#233772] focus:outline-none focus:ring-2 focus:ring-[#233772]/20"
                    />
                  </div>

                  {erroSolicitacao && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{erroSolicitacao}</div>
                  )}

                  <button
                    disabled={enviandoSolicitacao}
                    className="w-full h-11 rounded-xl bg-[#233772] text-[#FFC82D] font-black uppercase tracking-[0.16em] disabled:opacity-60"
                  >
                    {enviandoSolicitacao ? 'Enviando...' : 'Enviar solicitação'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
