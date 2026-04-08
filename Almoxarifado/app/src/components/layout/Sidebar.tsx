import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, ClipboardList, Truck, Laptop, LogOut, Menu, X, ExternalLink, Sparkles, FileSpreadsheet, HardHat, Building2, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Solicitações',
    items: [
      { to: '/solicitacoes', icon: Sparkles, label: 'Solicitar (IA)' },
      { to: '/requisicoes', icon: ClipboardList, label: 'Requisições' },
    ],
  },
  {
    label: 'Estoque',
    items: [
      { to: '/estoque', icon: Package, label: 'Itens' },
      { to: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentações' },
    ],
  },
  {
    label: 'Frota',
    items: [
      { to: '/frota', icon: Truck, label: 'Veículos' },
    ],
  },
  {
    label: 'Segurança',
    items: [
      { to: '/epi', icon: HardHat, label: 'EPI / NR-6' },
    ],
  },
  {
    label: 'Compras',
    items: [
      { to: '/fornecedores', icon: Building2, label: 'Fornecedores' },
      { to: '/ordens-compra', icon: ShoppingCart, label: 'Ordens de Compra' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { to: '/relatorios', icon: FileSpreadsheet, label: 'Relatórios' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/meus-dispositivos', icon: Laptop, label: 'Meus Dispositivos' },
    ],
  },
];

const IS_ELECTRON = navigator.userAgent.includes('Electron');
const HUB_URL = IS_ELECTRON ? 'app://hub.local' : 'https://biasihub-portal.vercel.app';

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = usuario?.nome
    ? usuario.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <img src="/logo-biasi.png" alt="Biasi" className="h-8 w-auto" />
        <div>
          <p className="text-white text-sm font-bold leading-none">Almoxarifado</p>
          <p className="text-slate-400 text-[10px] mt-0.5">BiasíHub</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{section.label}</p>
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Link para Hub */}
        <div>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Portal</p>
          <a
            href={HUB_URL}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ExternalLink size={18} />
            BiasíHub Portal
          </a>
        </div>
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{usuario?.nome}</p>
            <p className="text-slate-500 text-[10px] truncate">{usuario?.departamento} · {usuario?.papel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-600/20 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 bg-slate-900 flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-slate-900 text-white rounded-xl shadow-lg"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-slate-900 h-full flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
