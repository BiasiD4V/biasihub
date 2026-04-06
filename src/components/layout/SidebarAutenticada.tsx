import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  Layers,
  FileText,
  ClipboardList,
  CheckSquare,
  Settings,
  LogOut,
  Hammer,
  ListChecks,
  Smartphone,
  FileSpreadsheet,
  Sparkles,
  MessageCircle,
  KanbanSquare,
  HardHat,
  Download,
  Gift,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';

interface ItemMenu {
  rotulo: string;
  para: string;
  icone: React.ElementType;
}

interface SecaoMenu {
  titulo: string;
  itens: ItemMenu[];
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
      { rotulo: 'Composições', para: '/composicoes', icone: Layers },
      { rotulo: 'Templates', para: '/templates', icone: FileText },
      { rotulo: 'Mão de Obra', para: '/mao-de-obra', icone: Hammer },
      { rotulo: 'Incluso / Excluso', para: '/incluso-excluso', icone: ListChecks },
    ],
  },
  {
    titulo: 'Operação',
    itens: [
      { rotulo: 'Orçamentos', para: '/orcamentos', icone: ClipboardList },
      { rotulo: 'Planilhas Orç.', para: '/planilha-orcamentaria', icone: FileSpreadsheet },
      { rotulo: 'Aprovações', para: '/aprovacoes', icone: CheckSquare },
      { rotulo: 'Indicações', para: '/indicacoes', icone: Gift },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { rotulo: 'Bira', para: '/bira', icone: KanbanSquare },
      { rotulo: 'Diário de Obra', para: '/rdo', icone: HardHat },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { rotulo: 'Configurações', para: '/configuracoes', icone: Settings },
      { rotulo: 'Meus Dispositivos', para: '/meus-dispositivos', icone: Smartphone },
    ],
  },
];

const MENU_ADMIN: SecaoMenu[] = [
  {
    titulo: 'Administração',
    itens: [
      { rotulo: 'Membros', para: '/membros', icone: Users },
    ],
  },
];

const classAtivo =
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-blue-600 text-white font-medium';
const classInativo =
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors';

interface SidebarProps {
  onNavigate?: () => void;
  onAbrirPaulo?: () => void;
  onAbrirChat?: () => void;
  unreadCount?: number;
}

export function SidebarAutenticada({ onNavigate, onAbrirPaulo, onAbrirChat, unreadCount = 0 }: SidebarProps) {
  const { usuario, logout } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<any>(() => (window as any).__pwaInstallPrompt ?? null);
  const [jaInstalado, setJaInstalado] = useState(() => window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    // Caso o evento já tenha sido capturado antes do React montar
    if ((window as any).__pwaInstallPrompt) setInstallPrompt((window as any).__pwaInstallPrompt);

    const onReady = () => setInstallPrompt((window as any).__pwaInstallPrompt);
    const onInstalled = () => { setJaInstalado(true); setInstallPrompt(null); };

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

  return (
    <aside className="h-full w-[85vw] sm:w-64 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center px-5 py-5 border-b border-slate-800">
        <img src="/logo-biasi-branco.png" alt="Biasi Engenharia" className="h-10 w-auto" />
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {MENU.map((secao) => (
          <div key={secao.titulo}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
              {secao.titulo}
            </p>
            <ul className="space-y-0.5">
              {secao.itens.map((item) => {
                const Icone = item.icone;
                return (
                  <li key={item.para}>
                    <NavLink
                      to={item.para}
                      onClick={onNavigate}
                      className={({ isActive }) => (isActive ? classAtivo : classInativo)}
                    >
                      <Icone size={17} />
                      {item.rotulo}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Menu admin e gestor */}
        {(usuario?.papel === 'admin' || usuario?.papel === 'gestor' || usuario?.papel === 'dono') && MENU_ADMIN.map((secao) => (
          <div key={secao.titulo}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
              {secao.titulo}
            </p>
            <ul className="space-y-0.5">
              {secao.itens.map((item) => {
                const Icone = item.icone;
                return (
                  <li key={item.para}>
                    <NavLink
                      to={item.para}
                      onClick={onNavigate}
                      className={({ isActive }) => (isActive ? classAtivo : classInativo)}
                    >
                      <Icone size={17} />
                      {item.rotulo}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Botão instalar PWA */}
      {!jaInstalado && installPrompt && (
        <div className="px-3 pb-2">
          <button
            onClick={instalarApp}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <Download size={14} />
            Instalar App no dispositivo
          </button>
        </div>
      )}

      {/* Rodapé com usuário */}
      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {usuario?.nome.charAt(0) ?? 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{usuario?.nome ?? '—'}</p>
            <p className="text-xs text-slate-400 capitalize">{usuario?.papel ?? ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => { onAbrirPaulo?.(); onNavigate?.(); }}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs text-indigo-300 hover:bg-indigo-900/40 hover:text-indigo-200 transition-colors"
            title="Abrir Paulo AJUDA"
          >
            <Sparkles size={15} />
            Paulo
          </button>
          <button
            onClick={() => { onAbrirChat?.(); onNavigate?.(); }}
            className="relative flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs text-sky-300 hover:bg-sky-900/40 hover:text-sky-200 transition-colors"
            title="Abrir Chat"
          >
            <MessageCircle size={15} />
            Chat
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
