import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Bot,
  Calendar,
  ClipboardList,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Truck,
  Laptop,
  X,
  BarChart3,
  Wrench,
  Users,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabase/client';

interface SidebarProps {
  onAbrirChat: () => void;
}

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Requisições',
    items: [
      { to: '/requisicoes', icon: ClipboardList, label: 'Requisições' },
      { to: '/solicitacoes/gerenciar', icon: ClipboardList, label: 'Gerenciar Solicitações' },
      { to: '/solicitacoes/rastreio', icon: Truck, label: 'Rastreio de Entrega' },
      { to: '/solicitacoes/historico', icon: FileSpreadsheet, label: 'Histórico por Pessoa' },
      { to: '/solicitacoes/devolucoes', icon: ArrowLeftRight, label: 'Controle de Devolução' },
    ],
  },
  {
    label: 'Almoxarifado',
      items: [
        { to: '/estoque', icon: Package, label: 'Itens' },
        { to: '/ferramentas', icon: Wrench, label: 'Ferramentas' },
        { to: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentações' },
        { to: '/obras', icon: Building2, label: 'Obras' },
      ],
  },
  {
    label: 'Frota',
    items: [
      { to: '/frota', icon: Truck, label: 'Veículos' },
      { to: '/calendario', icon: Calendar, label: 'Calendário' },
    ],
  },
  {
    label: 'Análise',
    items: [{ to: '/relatorios', icon: FileSpreadsheet, label: 'Relatórios' }],
  },
  {
    label: 'Time',
    items: [
      { to: '/reunioes', icon: Users, label: 'Reuniões' },
      { to: '/membros', icon: Users, label: 'Membros' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/agentes', icon: Bot, label: 'Agentes' },
      { to: '/meus-dispositivos', icon: Laptop, label: 'Meus dispositivos' },
    ],
  },
];

const IS_ELECTRON = navigator.userAgent.includes('Electron');
const HUB_URL = IS_ELECTRON
  ? (import.meta.env.DEV ? 'http://localhost:5176/' : 'app://hub.local/')
  : 'https://biasihub-portal.vercel.app/';
const HUB_REDIRECT_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = HUB_REDIRECT_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function Sidebar({ onAbrirChat }: SidebarProps) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const iniciais = useMemo(() => {
    if (!usuario?.nome) return 'U';
    return usuario.nome
      .split(' ')
      .slice(0, 2)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  }, [usuario?.nome]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function voltarAoHub() {
    try {
      const {
        data: { session },
      } = await withTimeout(supabase.auth.getSession());

      if (session?.access_token && session?.refresh_token) {
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
      // fallback abaixo
    }

    // fallback: sessao "lembrar de mim" salva refresh token em localStorage
    try {
      const refreshToken = localStorage.getItem('remember_me_refresh_token');
      if (refreshToken) {
        const { data, error } = await withTimeout(supabase.auth.refreshSession({ refresh_token: refreshToken }));
        const refreshed = data.session;
        if (!error && refreshed?.access_token && refreshed.refresh_token) {
          const hash = [
            `access_token=${refreshed.access_token}`,
            `refresh_token=${refreshed.refresh_token}`,
            'token_type=bearer',
            `expires_in=${refreshed.expires_in ?? 3600}`,
          ].join('&');
          window.location.href = `${HUB_URL}#${hash}`;
          return;
        }
      }
    } catch {
      // segue fallback final
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
            <p className="text-slate-300 text-[9px] uppercase font-black tracking-[0.4em] mt-1.5 opacity-90">Almoxarifado</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto relative z-10 mt-4">
        <p className="px-4 pb-4 text-[9px] font-black text-white/55 uppercase tracking-[0.3em]">Protocolos de Rede</p>

        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1.5 mb-4">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.34em] text-[#8EA2D4]">{section.label}</p>
            <ul className="space-y-1">
              {section.items.map(({ to, icon: Icon, label, badge }: any) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 overflow-hidden ${
                        isActive
                          ? 'bg-white/10 text-white shadow-2xl border-2 border-white/20'
                          : 'text-slate-200 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute inset-0 bg-[#FFC82D]/10 blur-xl pointer-events-none" />}
                        <div className="relative z-10 flex items-center gap-3 w-full">
                          <Icon size={16} className="transition-all duration-300 group-hover:scale-110 group-hover:text-[#FFC82D]" />
                          <span className="flex-1 text-[11px] font-black uppercase tracking-[0.16em]">{label}</span>
                          {badge && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white">{badge}</span>
                          )}
                          {isActive && <span className="absolute -right-4 w-1 h-6 bg-[#FFC82D] rounded-full shadow-[0_0_12px_rgba(255,200,45,0.9)]" />}
                        </div>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-auto px-4 pb-10 pt-6 border-t-2 border-white/5 space-y-6 relative z-10 bg-slate-900/20 backdrop-blur-md">
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
            <span className="text-white text-xs font-black tracking-tighter">{iniciais}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[11px] font-black uppercase tracking-widest truncate">{usuario?.nome?.split(' ')[0] ?? 'Usuário'}</p>
            <p className="text-[#FFC82D] text-[9px] uppercase font-black tracking-[0.3em] truncate mt-0.5">{usuario?.papel ?? ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onAbrirChat();
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
      <aside className="hidden h-full w-64 flex-shrink-0 lg:flex relative z-50">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-50 p-3 bg-slate-900/80 backdrop-blur-lg text-white rounded-2xl border border-white/10 shadow-2xl"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
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
