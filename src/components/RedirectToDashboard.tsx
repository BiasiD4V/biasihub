import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RedirectToDashboard() {
  const { isAuthenticated, loading } = useAuth();

  // Enquanto verifica autenticação, mostrar loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se autenticado, ir para dashboard; senão, ir para login
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}