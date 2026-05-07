import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  CheckSquare,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Gift,
  Hammer,
  HardHat,
  Home,
  KanbanSquare,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  Smartphone,
  Trophy,
  Truck,
  Users,
  BarChart2,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabase/client';

interface ItemMenu {
  rotulo: string;
  para: string;
  icone: React.ElementType;
}

interface SecaoMenu {
  titulo: string;
  itens: ItemMenu[];
}

interface SidebarProps {
  onNavigate?: () => void;
  onAbrirChat?: () => void;
  unreadCount?: number;
}

const MENU: SecaoMenu[] = [
  {
    titulo: 'Principal',
    itens: [{ rotulo: 'Dashboard', para: '/dashboard', icone: LayoutDashboard }],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { rotulo: 'Clientes', para: '/clientes', icone: Users },
      { rotulo: 'Fornecedores', para: '/fornecedores', icone: Truck },
      { rotulo: 'Insumos', para: '/insumos', icone: Package },
      { rotulo: 'Composi\u00e7\u00f5es', para: '/composicoes', icone: Layers },
      { rotulo: 'Templates', para: '/templates', icone: FileText },
      { rotulo: 'M\u00e3o de obra', para: '/mao-de-obra', icone: Hammer },
      { rotulo: 'Incluso / Excluso', para: '/incluso-excluso', icone: CheckSquare },
    ],
  },
  {
    titulo: 'Opera\u00e7\u00e3o',
    itens: [
      { rotulo: 'Or\u00e7amentos', para: '/orcamentos', icone: ClipboardList },
      { rotulo: 'Planilha Orc.', para: '/planilha-orcamentaria', icone: FileSpreadsheet },
      { rotulo: 'Aprova\u00e7\u00f5es', para: '/aprovacoes', icone: CheckSquare },
      { rotulo: 'Indica\u00e7\u00f5es', para: '/indicacoes', icone: Gift },
    ],
  },
  {
    titulo: 'Gest\u00e3o',
    itens: [
      { rotulo: 'Arena', para: '/arena', icone: Trophy },
      { rotulo: 'Bira', para: '/bira', icone: KanbanSquare },
      { rotulo: 'Reuni\u00f5es', para: '/reunioes', icone: Users },
      { rotulo: 'Calend\u00e1rio', para: '/calendario', icone: Calendar },
      { rotulo: 'ADM Central', para: '/adm-central', icone: BarChart2 },
      { rotulo: 'Aprendizados', para: '/aprendizados', icone: BookOpen },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { rotulo: 'Configura\u00e7\u00f5es', para: '/configuracoes', icone: Settings },
      { rotulo: 'Meus dispositivos', para: '/meus-dispositivos', icone: Smartphone },
    ],
  },
];

const MENU_GESTAO: SecaoMenu[] = [
  {
    titulo: 'Obras',
    itens: [{ rotulo: 'Di\u00e1rio de obra', para: '/rdo', icone: HardHat }],
  },
];

const MENU_ADMIN: SecaoMenu[] = [
  {
    titulo: 'Administra\u00e7\u00e3o',
    itens: [{ rotulo: 'Membros', para: '/membros', icone: Users }],
  },
];

function isCapacitorRuntime() {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(
    w.Capacitor ||
      w.cordova ||
      window.location.origin === 'https://localhost' ||
      navigator.userAgent.includes('Capacitor')
  );
}

const IS_ELECTRON = navigator.userAgent.includes('Electron');
const IS_CAPACITOR = isCapacitorRuntime();
const HUB_URL = IS_ELECTRON
  ? (import.meta.env.DEV ? 'http://localhost:5176/' : 'app://hub.local/')
  : IS_CAPACITOR
  ? '/index.html#/'
  : 'https://biasihub-portal.vercel.app/';

function renderSecao(secao: SecaoMenu, onNavigate?: () => void) {
  return (
    <div key={secao.titulo} className="space-y-1.5 mb-4">
      <p className="px-4 text-[9px] font-black uppercase tracking-[0.34em] text-[#8EA2D4]">{secao.titulo}</p>
      <ul className="space-y-1">
        {secao.itens.map((item) => {
          const Icone = item.icone;
          return (
            <li key={item.para}>
              <NavLink
                to={item.para}
                onClick={onNavigate}
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
                      <Icone size={16} className="transition-all duration-300 group-hover:scale-110 group-hover:text-[#FFC82D]" />
                      <span className="flex-1 text-[11px] font-black uppercase tracking-[0.16em]">{item.rotulo}</span>
                      {isActive && <span className="absolute -right-4 w-1 h-6 bg-[#FFC82D] rounded-full shadow-[0_0_12px_rgba(255,200,45,0.9)]" />}
                    </div>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SidebarAutenticada({
  onNavigate,
  onAbrirChat,
  unreadCount = 0,
}: SidebarProps) {
  const { usuario, logout } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<any>(() => (window as any).__pwaInstallPrompt ?? null);
  const [jaInstalado, setJaInstalado] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches
  );

  const isGestao = useMemo(
    () => usuario?.papel === 'gestor' || usuario?.papel === 'admin' || usuario?.papel === 'dono' || usuario?.papel === 'comercial',
    [usuario?.papel]
  );
  const isAdmin = useMemo(
    () => usuario?.papel === 'admin' || usuario?.papel === 'gestor' || usuario?.papel === 'dono',
    [usuario?.papel]
  );

  useEffect(() => {
    if ((window as any).__pwaInstallPrompt) setInstallPrompt((window as any).__pwaInstallPrompt);

    const onReady = () => setInstallPrompt((window as any).__pwaInstallPrompt);
    const onInstalled = () => {
      setJaInstalado(true);
      setInstallPrompt(null);
    };

    window.addEventListener('pwaInstallReady', onReady);
    window.addEventListener('pwaInstalled', onInstalled);
    return () => {
      window.removeEventListener('pwaInstallReady', onReady);
      window.removeEventListener('pwaInstalled', onInstalled);
    };
  }, []);

  async function instalarApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setJaInstalado(true);
    setInstallPrompt(null);
  }

  const iniciais = usuario?.nome
    ? usuario.nome
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  async function voltarAoHub() {
    if (IS_CAPACITOR) {
      window.location.assign(HUB_URL);
      return;
    }

    // Fast-path: tenta pegar a sessão sincronamente do localStorage para evitar o delay do getSession()
    try {
      const storageKey = 'sb-vzaabtzcilyoknksvhrc-auth-token';
      const sessionStr = localStorage.getItem(storageKey);
      
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.access_token) {
          const hash = [
            `access_token=${session.access_token}`,
            `refresh_token=${session.refresh_token}`,
            'token_type=bearer',
            `expires_in=${session.expires_in ?? 3600}`,
          ].join('&');
          window.location.href = `${HUB_URL}#${hash}`;
          return;
        }
      }
    } catch {
      // fallback
    }

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

  return (
    <aside className="relative h-full w-[85vw] sm:w-64 lg:w-64 overflow-hidden border-r-2 border-white/10 bg-slate-900/40 backdrop-blur-3xl">
      <div className="pointer-events-none absolute top-0 left-0 w-32 h-32 bg-[#FFC82D]/12 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="px-8 py-10 relative z-10 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-white font-black text-xl tracking-tighter leading-none uppercase">
                Biasi<span className="text-[#FFC82D]">Hub</span>
              </h1>
              <p className="text-slate-300 text-[9px] uppercase font-black tracking-[0.4em] mt-1.5 opacity-90">Comercial</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto relative z-10 mt-4">
          <p className="px-4 pb-4 text-[9px] font-black text-white/55 uppercase tracking-[0.3em]">Protocolos de Rede</p>
          {MENU.map((secao) => renderSecao(secao, onNavigate))}
          {isGestao && MENU_GESTAO.map((secao) => renderSecao(secao, onNavigate))}
          {isAdmin && MENU_ADMIN.map((secao) => renderSecao(secao, onNavigate))}
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

          {!jaInstalado && installPrompt && (
            <button
              onClick={instalarApp}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#4A69A8] bg-[#1A2F63] px-3 text-[11px] font-semibold text-[#DCE8FF] transition-colors hover:bg-[#243E7D]"
            >
              <Download size={14} />
              Instalar app
            </button>
          )}

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
                onAbrirChat?.();
                onNavigate?.();
              }}
              className="relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200 transition-colors hover:bg-sky-500/20 hover:text-white"
            >
              <MessageCircle size={14} />
              Chat
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={logout}
              className="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-200 transition-colors hover:bg-rose-500/20 hover:text-white"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
