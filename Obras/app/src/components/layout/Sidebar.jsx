import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  Building2,
  Calculator,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  Database,
  DollarSign,
  Gauge,
  GitBranch,
  Handshake,
  HardHat,
  HelpCircle,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ShoppingCart,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  FileText,
  Menu,
  X,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const grupos = [
  {
    titulo: 'Obras',
    itens: [
      { path: '/dashboard', icone: LayoutDashboard, label: 'Dashboard Obras' },
      { path: '/obras', icone: Building2, label: 'Obras' },
      { path: '/contratos', icone: Handshake, label: 'Contratos' },
      { path: '/medicoes-contrato', icone: ClipboardCheck, label: 'Medicoes' },
      { path: '/suprimentos', icone: ShoppingCart, label: 'Suprimentos' },
      { path: '/tarefas', icone: CheckSquare, label: 'Gestao de tarefas' },
    ],
  },
  {
    titulo: 'Planejamento',
    itens: [
      { path: '/planejamento', icone: LayoutDashboard, label: 'Dashboard' },
      { path: '/planejamento/cronograma', icone: Calendar, label: 'Cronograma' },
      { path: '/planejamento/recursos', icone: Users, label: 'Recursos' },
      { path: '/planejamento/histograma-mo', icone: BarChart2, label: 'Histograma MO' },
      { path: '/planejamento/progresso', icone: Activity, label: 'Progresso semanal' },
      { path: '/planejamento/curva-s', icone: BarChart2, label: 'Curva S' },
      { path: '/planejamento/evm', icone: Gauge, label: 'Desempenho (EVM)' },
      { path: '/planejamento/reprogramacao', icone: GitBranch, label: 'Reprogramacao' },
      { path: '/planejamento/relatorio', icone: FileText, label: 'Relatorios' },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { path: '/financeiro', icone: DollarSign, label: 'Financeiro' },
      { path: '/previsto-realizado', icone: TrendingUp, label: 'Previsto x realizado' },
      { path: '/custos-mo', icone: HardHat, label: 'Custos MO' },
      { path: '/despesas-indiretas', icone: Layers, label: 'Desp. indiretas' },
      { path: '/adm-central', icone: Calculator, label: 'ADM central' },
      { path: '/resultado', icone: Target, label: 'Resultado operacional' },
    ],
  },
  {
    titulo: 'Administracao',
    itens: [
      { path: '/audit-log', icone: ShieldCheck, label: 'Auditoria' },
      { path: '/sienge-sync', icone: Database, label: 'Integracao Sienge' },
    ],
  },
];

const IS_ELECTRON = navigator.userAgent.includes('Electron');
const HUB_URL = IS_ELECTRON
  ? (import.meta.env.DEV ? 'http://localhost:5176/' : 'app://hub.local/')
  : 'https://biasihub-portal.vercel.app/';

export default function Sidebar({ onAbrirChat }) {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = useMemo(() => {
    if (!usuario?.nome) return 'U';
    return usuario.nome
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }, [usuario?.nome]);

  const handleLogout = async () => {
    await logout();
    window.location.href = HUB_URL;
  };

  async function voltarAoHub() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const hash = [
          `access_token=${session.access_token}`,
          `refresh_token=${session.refresh_token}`,
          'token_type=bearer',
          `expires_in=${session.expires_in ?? 3600}`,
        ].join('&');
        window.location.href = `${HUB_URL}#${hash}`;
        return;
      }
    } catch {
      // fallback
    }

    if (window.location.hash.includes('access_token=')) {
      window.location.href = `${HUB_URL}${window.location.hash}`;
      return;
    }

    window.location.href = HUB_URL;
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col overflow-hidden border-r-2 border-white/10 bg-slate-900/40 backdrop-blur-3xl relative">
      <div className="pointer-events-none absolute top-0 left-0 w-32 h-32 bg-[#FFC82D]/12 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="px-8 py-10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-white font-black text-xl tracking-tighter leading-none uppercase">
              Biasi<span className="text-[#FFC82D]">Hub</span>
            </h1>
            <p className="text-slate-300 text-[9px] uppercase font-black tracking-[0.4em] mt-1.5 opacity-90">Obras</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto relative z-10 mt-4">
        <p className="px-4 pb-4 text-[9px] font-black text-white/55 uppercase tracking-[0.3em]">Protocolos de Rede</p>

        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="space-y-1.5 mb-4">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.34em] text-[#8EA2D4]">{grupo.titulo}</p>
            <div className="space-y-1">
              {grupo.itens.map((item) => {
                const isAtivo =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 overflow-hidden ${
                      isAtivo
                        ? 'bg-white/10 text-white shadow-2xl border-2 border-white/20'
                        : 'text-slate-200 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isAtivo && <span className="absolute inset-0 bg-[#FFC82D]/10 blur-xl pointer-events-none" />}
                    <div className="relative z-10 flex items-center gap-3 w-full">
                      <item.icone size={16} className="transition-all duration-300 group-hover:scale-110 group-hover:text-[#FFC82D]" />
                      <span className="flex-1 text-[11px] font-black uppercase tracking-[0.16em]">{item.label}</span>
                      {isAtivo && <span className="absolute -right-4 w-1 h-6 bg-[#FFC82D] rounded-full shadow-[0_0_12px_rgba(255,200,45,0.9)]" />}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        <NavLink
          to="/glossario"
          onClick={() => setMobileOpen(false)}
          className="group relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 overflow-hidden text-slate-200 hover:text-white hover:bg-white/5"
        >
          <HelpCircle size={16} className="transition-all duration-300 group-hover:scale-110 group-hover:text-[#FFC82D]" />
          <span className="flex-1 text-[11px] font-black uppercase tracking-[0.16em]">Glossario</span>
        </NavLink>
      </nav>

      <div className="mt-auto px-4 pb-8 pt-6 border-t-2 border-white/5 space-y-4 relative z-10 bg-slate-900/20 backdrop-blur-md">
        <button
          onClick={() => {
            void voltarAoHub();
          }}
          className="w-full flex h-11 items-center justify-center gap-2 rounded-xl border border-[#FFC82D]/40 bg-[#FFC82D]/12 px-4 text-xs font-black uppercase tracking-[0.2em] text-[#FFC82D] transition-colors hover:bg-[#FFC82D] hover:text-[#233772]"
        >
          <Home size={14} />
          Voltar ao Hub
        </button>

        <div className="flex items-center gap-4 p-4 rounded-[24px] bg-white/5 border-2 border-white/5 transition-all duration-300">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 flex items-center justify-center border-2 border-white/20 flex-shrink-0">
            <span className="text-white text-xs font-black tracking-tighter">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[11px] font-black uppercase tracking-widest truncate">{usuario?.nome?.split(' ')[0] ?? 'Usuario'}</p>
            <p className="text-[#FFC82D] text-[9px] uppercase font-black tracking-[0.3em] truncate mt-0.5">{usuario?.perfil ?? ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onAbrirChat?.();
              setMobileOpen(false);
            }}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200 transition-colors hover:bg-sky-500/20 hover:text-white"
          >
            <MessageCircle size={14} />
            Chat
          </button>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-200 transition-colors hover:bg-rose-500/20 hover:text-white"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex h-screen w-64 flex-shrink-0 relative z-50">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-6 left-6 z-50 p-3 bg-slate-900/80 backdrop-blur-lg text-white rounded-2xl border border-white/10 shadow-2xl"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-6 right-[-48px] p-2 text-white bg-slate-900/80 rounded-full border border-white/10"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
