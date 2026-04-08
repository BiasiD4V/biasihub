import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, ClipboardList, Truck, Laptop, LogOut, Menu, X, Sparkles, FileSpreadsheet, Bot, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Assistente IA',
    items: [
      { to: '/igor', icon: Bot, label: 'Igor', badge: 'IA' },
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
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[rgba(255,255,255,0.1)]">
        <img src="/logo-branco.svg" alt="Biasi" className="h-9 w-auto" />
        <div>
          <p className="text-white text-sm font-bold leading-none">Almoxarifado</p>
          <p className="text-[rgba(255,255,255,0.75)] text-[10px] mt-0.5">BiasíHub</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-[rgba(255,200,45,0.6)] mb-1">{section.label}</p>
            {section.items.map(({ to, icon: Icon, label, badge }: any) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#FFC82D] text-[#233772] font-bold'
                      : 'text-[rgba(255,255,255,0.75)] hover:text-[#FFC82D] hover:bg-[rgba(255,200,45,0.1)]'
                  }`
                }
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500 text-white leading-none">
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

      </nav>

      {/* Botão Voltar ao Hub */}
      <div className="px-3 pb-2">
        <button
          onClick={() => { window.location.href = HUB_URL }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ backgroundColor: 'rgba(255,200,45,0.12)', color: '#FFC82D' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FFC82D'; (e.currentTarget as HTMLElement).style.color = '#1e293b' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,200,45,0.12)'; (e.currentTarget as HTMLElement).style.color = '#FFC82D' }}
        >
          <Home size={16} />
          Voltar ao Hub
        </button>
      </div>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{usuario?.nome}</p>
            <p className="text-[rgba(255,200,45,0.6)] text-[10px] truncate">{usuario?.departamento} · {usuario?.papel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[rgba(255,255,255,0.75)] hover:text-red-400 hover:bg-red-600/20 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 bg-[#233772] flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-[#233772] text-white rounded-xl shadow-lg"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-[#233772] h-full flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-[rgba(255,255,255,0.75)] hover:text-white">
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
