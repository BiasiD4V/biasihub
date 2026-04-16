import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, LogOut, Menu, X, Laptop, ShieldCheck, MessageCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { acessoRepository } from '../../infrastructure/supabase/acessoRepository';
import { supabase } from '../../infrastructure/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  chatAberto: boolean;
  onAbrirChat: () => void;
}

const NAV_ITEMS_BASE = [
  { to: '/', icon: LayoutGrid, label: 'Portal', end: true, adminOnly: false },
  { to: '/membros', icon: Users, label: 'Membros', end: false, adminOnly: false },
  { to: '/meus-dispositivos', icon: Laptop, label: 'Dispositivos', end: false, adminOnly: false },
  { to: '/gerenciar-acessos', icon: ShieldCheck, label: 'Acessos', end: false, adminOnly: true },
];

export function Sidebar({ chatAberto, onAbrirChat }: SidebarProps) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [chatNaoLidas, setChatNaoLidas] = useState(0);
  const canaisDoUsuarioRef = useRef<Set<string>>(new Set());
  const chatAbertoRef = useRef(chatAberto);
  const isAdmin = usuario?.papel === 'admin' || usuario?.papel === 'dono';

  useEffect(() => {
    chatAbertoRef.current = chatAberto;
    if (chatAberto) {
      setChatNaoLidas(0);
    }
  }, [chatAberto]);

  useEffect(() => {
    const bridge = (window as any).electronBridge;
    if (bridge?.getAppVersion) {
      bridge.getAppVersion().then((v: string) => setAppVersion(v)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    acessoRepository.contarPendentes().then(setPendentes);
    const interval = setInterval(() => {
      acessoRepository.contarPendentes().then(setPendentes);
    }, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    const userId = usuario?.id;
    if (!userId) return;

    let active = true;

    async function carregarCanaisDoUsuario() {
      const { data } = await supabase
        .from('chat_membros')
        .select('canal_id')
        .eq('usuario_id', userId);

      canaisDoUsuarioRef.current = new Set(
        (data ?? []).map((row: any) => row.canal_id).filter(Boolean)
      );
    }

    function mensagemContaParaBadge(nova: any): boolean {
      if (!nova || nova.remetente_id === userId || nova.tipo === 'reacao') return false;
      if (chatAbertoRef.current) return false;

      const ehDmParaMim = nova.canal === 'dm' && nova.destinatario_id === userId;
      const ehCanalV2 = !!nova.canal_id && canaisDoUsuarioRef.current.has(nova.canal_id);
      const ehGeralLegado = !nova.canal_id && nova.canal === 'geral';

      return ehDmParaMim || ehCanalV2 || ehGeralLegado;
    }

    carregarCanaisDoUsuario();

    const channel = supabase
      .channel(`chat-badge-hub-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensagens' },
        (payload) => {
          const nova = payload.new as any;
          if (!mensagemContaParaBadge(nova)) return;
          if (active) setChatNaoLidas((prev) => Math.min(prev + 1, 99));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_membros' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { usuario_id?: string } | undefined;
          if (row?.usuario_id === userId) {
            carregarCanaisDoUsuario();
          }
        }
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [usuario?.id]);

  const NAV_ITEMS = NAV_ITEMS_BASE.filter(item => !item.adminOnly || isAdmin);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = usuario?.nome
    ? usuario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?';

  const SidebarContent = () => (
    <div className="flex flex-col h-full premium-glass bg-slate-900/40 border-r-2 border-white/10 backdrop-blur-3xl relative overflow-hidden">
      {/* Dynamic Background Blur inside sidebar */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-[#FFC82D]/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Logo - Singularity Style */}
      <div className="px-8 py-10 relative z-10">
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:rotate-[10deg] group-hover:bg-[#FFC82D] transition-all duration-500">
             <BarChart3 size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl tracking-tighter leading-none uppercase">Biasi<span className="text-[#FFC82D]">Hub</span></h1>
            <p className="text-slate-300 text-[9px] uppercase font-black tracking-[0.4em] mt-1.5 opacity-90">
              {appVersion ? `System v${appVersion}` : 'Terminal 01'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Modules */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar relative z-10 mt-4">
        <p className="px-4 pb-4 text-[9px] font-black text-white/55 uppercase tracking-[0.3em]">Protocolos de Rede</p>
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-4 px-4 py-4 rounded-[20px] transition-all duration-500 overflow-hidden ${
                isActive
                  ? 'bg-white/10 text-white shadow-2xl border-2 border-white/20'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-0 bg-[#FFC82D]/10 blur-xl pointer-events-none" />}

                <div className="relative z-10 flex items-center gap-4 w-full">
                  <Icon size={20} className="transition-all duration-500 group-hover:scale-125 group-hover:text-[#FFC82D]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>

                  {to === '/gerenciar-acessos' && pendentes > 0 && (
                    <span className="ml-auto bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse">
                      {pendentes}
                    </span>
                  )}

                  {isActive && <span className="absolute -right-4 w-1 h-6 bg-[#FFC82D] rounded-full shadow-[0_0_12px_rgba(255,200,45,0.9)]" />}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User & Global Actions */}
      <div className="mt-auto px-4 pb-10 pt-6 border-t-2 border-white/5 space-y-6 relative z-10 bg-slate-900/20 backdrop-blur-md">
         {/* User Console */}
         <div className="flex items-center gap-4 p-4 rounded-[24px] bg-white/5 border-2 border-white/5 group hover:border-white/10 transition-all duration-500">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 flex items-center justify-center shadow-2xl border-2 border-white/20 flex-shrink-0 group-hover:rotate-6 transition-transform">
               <span className="text-white text-xs font-black tracking-tighter">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
               <p className="text-white text-[11px] font-black uppercase tracking-widest truncate">{usuario?.nome?.split(' ')[0]}</p>
               <p className="text-[#FFC82D] text-[9px] uppercase font-black tracking-[0.3em] truncate mt-0.5">{usuario?.papel}</p>
            </div>
         </div>

         {/* Command Buttons */}
         <div className="flex flex-col gap-3">
            <motion.button
               whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.98 }}
               onClick={() => { setChatNaoLidas(0); onAbrirChat(); setMobileOpen(false); }}
               className="relative flex items-center justify-between w-full h-12 px-5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] bg-[#FFC82D]/12 text-[#FFC82D] border-2 border-[#FFC82D]/35 hover:bg-[#FFC82D] hover:text-[#233772] transition-all shadow-xl shadow-[#FFC82D]/20 group"
            >
               <div className="flex items-center gap-3">
                  <MessageCircle size={16} />
                  <span>Canais de Voz</span>
               </div>
               {chatNaoLidas > 0 && (
                 <span className="w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-lg flex items-center justify-center border-2 border-slate-900 group-hover:border-rose-600">
                   {chatNaoLidas}
                 </span>
               )}
            </motion.button>

            <button
               onClick={handleLogout}
               className="flex items-center gap-3 h-12 px-5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            >
               <LogOut size={16} />
               Sair
            </button>
         </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-full relative z-50">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-50 p-3 bg-slate-900/80 backdrop-blur-lg text-white rounded-2xl border border-white/10 shadow-2xl"
      >
        <Menu size={20} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-[100] flex">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" 
               onClick={() => setMobileOpen(false)} 
            />
            <motion.aside 
               initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="relative w-64 h-full flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-6 right-[-48px] p-2 text-white bg-slate-900/80 rounded-full border border-white/10"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}



