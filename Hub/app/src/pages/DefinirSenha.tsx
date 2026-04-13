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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 px-4 font-black">
      {/* Background Dinâmico - Mesma lógica da Login */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="premium-glass bg-white/10 border-2 border-white/20 p-10 rounded-[48px] shadow-2xl backdrop-blur-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-16 -translate-y-1/2 translate-x-1/2 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          {/* Ícone High-Tech */}
          <div className="w-20 h-20 rounded-[32px] bg-slate-900 border-2 border-white/20 flex items-center justify-center mx-auto mb-10 shadow-2xl group">
            <ShieldCheck size={36} className="text-sky-400 group-hover:scale-110 transition-transform duration-500" />
          </div>

          {/* Título e Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
              Olá, {usuario?.nome?.split(' ')[0]}!
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed max-w-[280px] mx-auto opacity-70">
              Protocolo de segurança: estabeleça sua credencial de acesso
            </p>
          </div>

          {erro && (
            <div className="mb-8 premium-glass bg-rose-500/10 border-2 border-rose-500/20 text-rose-300 text-[10px] font-black uppercase tracking-widest px-5 py-4 rounded-2xl animate-in zoom-in-95 duration-300">
              Erro de Sistema: {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                Nova Chave de Acesso
              </label>
              <div className="relative group">
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="MÍNIMO 06 CARACTERES"
                  required
                  className="w-full h-14 bg-white/5 border-2 border-white/10 rounded-[20px] px-6 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-black uppercase tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setMostrar(v => !v)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="absolute inset-0 rounded-[20px] pointer-events-none border-2 border-transparent group-within:border-indigo-500/20 transition-all duration-500" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                Validar Chave
              </label>
              <div className="relative group">
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="REPITA A CHAVE"
                  required
                  className="w-full h-14 bg-white/5 border-2 border-white/10 rounded-[20px] px-6 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-black uppercase tracking-widest"
                />
                <div className="absolute inset-0 rounded-[20px] pointer-events-none border-2 border-transparent group-within:border-indigo-500/20 transition-all duration-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full h-16 bg-white text-slate-900 font-black rounded-[24px] text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mt-8 shadow-xl shadow-black/20 hover:bg-sky-400 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  Sincronizando...
                </>
              ) : 'Ativar Acesso'}
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] opacity-40">
             Biasi Engineering Core · Sec-Ops
           </p>
        </div>
      </div>
    </div>
  );
}
