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
  BarChart2,
  Settings,
  LogOut,
  Hammer,
  ListChecks,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
      { rotulo: 'Aprovações', para: '/aprovacoes', icone: CheckSquare },
    ],
  },
  {
    titulo: 'Análise',
    itens: [{ rotulo: 'Relatórios', para: '/relatorios', icone: BarChart2 }],
  },
  {
    titulo: 'Sistema',
    itens: [{ rotulo: 'Configurações', para: '/configuracoes', icone: Settings }],
  },
];

const classAtivo =
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-blue-600 text-white font-medium';
const classInativo =
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors';

export function SidebarAutenticada() {
  const { usuario, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-40">
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
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
