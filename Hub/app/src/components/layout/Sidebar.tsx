import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Users, LogOut, Menu, X, Laptop, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { acessoRepository } from '../../infrastructure/supabase/acessoRepository';

const NAV_ITEMS_BASE = [
  { to: '/', icon: LayoutGrid, label: 'Portal', end: true, adminOnly: false },
  { to: '/membros', icon: Users, label: 'Membros', end: false, adminOnly: false },
  { to: '/meus-dispositivos', icon: Laptop, label: 'Meus Dispositivos', end: false, adminOnly: false },
  { to: '/gerenciar-acessos', icon: ShieldCheck, label: 'Acessos', end: false, adminOnly: true },
];

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState(0);

  const isAdmin = usuario?.papel === 'admin' || usuario?.papel === 'dono';

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

  const NAV_ITEMS = NAV_ITEMS_BASE.filter(item => !item.adminOnly || isAdmin);

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
          <p className="text-white text-sm font-bold leading-none">BiasíHub</p>
          <p className="text-[rgba(255,255,255,0.75)] text-[10px] mt-0.5">
            Portal Central{appVersion ? ` · v${appVersion}` : ''}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
            {to === '/gerenciar-acessos' && pendentes > 0 && (
              <span className="bg-[#FFC82D] text-[#233772] text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                {pendentes}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{usuario?.nome}</p>
            <p className="text-[rgba(255,200,45,0.6)] text-[10px] truncate">{usuario?.papel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[rgba(255,255,255,0.75)] hover:text-white hover:bg-red-600/20 hover:text-red-400 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#233772] flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-[#233772] text-white rounded-xl shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-[#233772] h-full flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-[rgba(255,255,255,0.75)] hover:text-white"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
