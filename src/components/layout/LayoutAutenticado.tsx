import { Navigate, Outlet } from 'react-router-dom';
import { SidebarAutenticada } from './SidebarAutenticada';
import { useAuth } from '../../context/AuthContext';

export function LayoutAutenticado() {
  const { isAuthenticated, loading } = useAuth();

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
