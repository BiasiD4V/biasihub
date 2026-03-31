import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SidebarAutenticada } from './SidebarAutenticada';
import { PauloAjuda } from './PauloAjuda';
import { useAuth } from '../../context/AuthContext';
import { Menu } from 'lucide-react';

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
      {/* Botão hamburger — só mobile */}
      <button
        onClick={() => setSidebarAberta(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-900 text-white p-2 rounded-lg shadow-lg"
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      {/* Overlay escuro — só mobile quando aberta */}
      {sidebarAberta && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={fecharSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarAutenticada onNavigate={fecharSidebar} />
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col min-h-screen lg:ml-64 pt-16 lg:pt-0 px-4 lg:px-0">
        <Outlet />
      </main>
      <PauloAjuda />
    </div>
  );
}
