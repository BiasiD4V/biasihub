import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabase/client';
import { Sidebar } from './Sidebar';
import { UpdateChecker } from './UpdateChecker';
import { NotificacoesDropdown } from '../NotificacoesDropdown';

export function LayoutAutenticado() {
  const { isAuthenticated, loading, usuario } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!usuario) return;

    async function registrarPresenca() {
      await supabase.from('presenca_usuarios').upsert({
        user_id: usuario!.id,
        esta_online: true,
        ultimo_heartbeat: new Date().toISOString(),
        ultima_entrada: new Date().toISOString(),
        pagina_atual: location.pathname,
      }, { onConflict: 'user_id' });
    }

    async function atualizarHeartbeat() {
      await supabase.from('presenca_usuarios').upsert({
        user_id: usuario!.id,
        esta_online: true,
        ultimo_heartbeat: new Date().toISOString(),
        pagina_atual: location.pathname,
      }, { onConflict: 'user_id' });
    }

    registrarPresenca();
    const interval = setInterval(atualizarHeartbeat, 60000);

    return () => {
      clearInterval(interval);
      supabase.from('presenca_usuarios').upsert({
        user_id: usuario!.id,
        esta_online: false,
        ultimo_heartbeat: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };
  }, [usuario, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Todos os usuários autenticados têm acesso ao Almoxarifado.
  // O controle granular (quem pode cadastrar, aprovar, etc.) é feito dentro de cada página.

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Banner de atualização (Desktop: redireciona para Hub) */}
        <UpdateChecker />
        {/* Topbar com notificações */}
        <div className="flex-shrink-0 flex justify-end items-center px-4 py-2 bg-slate-900 border-b border-slate-800 lg:hidden" />
        <div className="absolute top-3 right-4 z-20">
          <NotificacoesDropdown />
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
