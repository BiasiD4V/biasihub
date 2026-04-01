import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SidebarAutenticada } from './SidebarAutenticada';
import { PauloAjuda } from './PauloAjuda';
import { ChatPanel } from './ChatPanel';
import { useAuth } from '../../context/AuthContext';
import { ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react';

const STORAGE_KEY_SIDEBAR_HIDDEN = 'layout-sidebar-hidden-v1';

export function LayoutAutenticado() {
  const { isAuthenticated, loading, erroConexao } = useAuth();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [sidebarOcultaDesktop, setSidebarOcultaDesktop] = useState(false);
  const [pauloAberto, setPauloAberto] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SIDEBAR_HIDDEN);
      if (raw === '1') {
        setSidebarOcultaDesktop(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SIDEBAR_HIDDEN, sidebarOcultaDesktop ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [sidebarOcultaDesktop]);

  // Fechar sidebar ao navegar (mobile)
  const fecharSidebar = () => setSidebarAberta(false);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se houve erro de conexão, informar o usuário
  if (erroConexao) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Erro de conexão</h2>
          <p className="text-gray-600 mb-4">{erroConexao}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Top bar mobile — fixo no topo */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-slate-900 z-30 lg:hidden flex items-center px-3 gap-3 shadow-lg">
        <button
          onClick={() => setSidebarAberta(true)}
          className="text-white p-1.5 rounded-lg hover:bg-slate-800"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <img src="/logo-biasi-branco.png" alt="Biasi" className="h-6 w-auto" />
      </div>

      {/* Overlay escuro — só mobile quando aberta */}
      {sidebarAberta && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={fecharSidebar}
        />
      )}

      {sidebarOcultaDesktop && (
        <button
          type="button"
          onClick={() => setSidebarOcultaDesktop(false)}
          className="hidden lg:flex fixed top-4 left-3 z-40 items-center gap-2 rounded-lg bg-slate-900 text-white px-3 py-2 shadow-lg hover:bg-slate-800 transition-colors"
          aria-label="Mostrar menu lateral"
          title="Mostrar menu"
        >
          <ChevronsRight size={16} />
          <span className="text-sm font-medium">Menu</span>
        </button>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[85vw] sm:w-64
        transform transition-transform duration-200 ease-in-out
        ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarOcultaDesktop ? 'lg:-translate-x-full' : 'lg:translate-x-0'}
      `}>
        <button
          type="button"
          onClick={() => setSidebarOcultaDesktop(true)}
          className="hidden lg:flex absolute top-4 -right-3 z-[60] items-center justify-center h-8 w-8 rounded-full border border-slate-700 bg-slate-900 text-slate-200 shadow-md hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Ocultar menu lateral"
          title="Ocultar menu"
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Botão X fechar — mobile */}
        <button
          type="button"
          onClick={fecharSidebar}
          className="lg:hidden absolute top-4 right-3 z-[60] text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Fechar menu"
        >
          <X size={22} />
        </button>
        <SidebarAutenticada
          onNavigate={fecharSidebar}
          onAbrirPaulo={() => { setPauloAberto(true); setChatAberto(false); }}
          onAbrirChat={() => { setChatAberto(true); setPauloAberto(false); }}
          unreadCount={unreadCount}
        />
      </div>

      {/* Conteúdo principal */}
      <main className={`flex-1 flex flex-col min-h-screen min-w-0 pt-12 lg:pt-0 ${sidebarOcultaDesktop ? 'lg:ml-0' : 'lg:ml-64'}`}>
        <Outlet />
      </main>

      {/* Paulo AJUDA */}
      <PauloAjuda forceOpen={pauloAberto} onClose={() => setPauloAberto(false)} />

      {/* Chat da Equipe */}
      <ChatPanel
        aberto={chatAberto}
        onFechar={() => setChatAberto(false)}
        onUnreadChange={useCallback((c: number) => setUnreadCount(c), [])}
      />
    </div>
  );
}
