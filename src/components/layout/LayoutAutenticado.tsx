import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SidebarAutenticada } from './SidebarAutenticada';
import { PauloAjuda } from './PauloAjuda';
import { useAuth } from '../../context/AuthContext';
import { Menu, X } from 'lucide-react';

export function LayoutAutenticado() {
  const { isAuthenticated, loading, erroConexao } = useAuth();
  const [sidebarAberta, setSidebarAberta] = useState(false);

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

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[85vw] sm:w-64
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Botão X fechar — mobile */}
        <button
          type="button"
          onClick={fecharSidebar}
          className="lg:hidden absolute top-4 right-3 z-[60] text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Fechar menu"
        >
          <X size={22} />
        </button>
        <SidebarAutenticada onNavigate={fecharSidebar} />
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0 lg:ml-64 pt-12 lg:pt-0">
        <Outlet />
      </main>
      <PauloAjuda />
    </div>
  );
}
