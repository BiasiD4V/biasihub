import { Navigate, Outlet } from 'react-router-dom';
import { SidebarAutenticada } from './SidebarAutenticada';
import { useAuth } from '../../context/AuthContext';

export function LayoutAutenticado() {
  const { isAuthenticated, loading, erroConexao } = useAuth();

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
      <SidebarAutenticada />
      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
