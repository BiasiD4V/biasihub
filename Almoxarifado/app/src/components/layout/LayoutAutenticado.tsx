import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabase/client';
import { Sidebar } from './Sidebar';
import { UpdateChecker } from './UpdateChecker';
import { NotificacoesDropdown } from '../NotificacoesDropdown';
import { ChatMembros } from '../ChatMembros';

export function LayoutAutenticado() {
  const { isAuthenticated, loading, usuario } = useAuth();
  const location = useLocation();
  const [chatAberto, setChatAberto] = useState(false);

  useEffect(() => {
    if (!usuario) return;

    async function registrarPresenca() {
      await supabase.from('presenca_usuarios').upsert(
        {
          user_id: usuario!.id,
          esta_online: true,
          ultimo_heartbeat: new Date().toISOString(),
          ultima_entrada: new Date().toISOString(),
          pagina_atual: location.pathname,
        },
        { onConflict: 'user_id' }
      );
    }

    async function atualizarHeartbeat() {
      await supabase.from('presenca_usuarios').upsert(
        {
          user_id: usuario!.id,
          esta_online: true,
          ultimo_heartbeat: new Date().toISOString(),
          pagina_atual: location.pathname,
        },
        { onConflict: 'user_id' }
      );
    }

    registrarPresenca();
    const interval = setInterval(atualizarHeartbeat, 60000);

    return () => {
      clearInterval(interval);
      supabase.from('presenca_usuarios').upsert(
        {
          user_id: usuario!.id,
          esta_online: false,
          ultimo_heartbeat: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    };
  }, [usuario, location.pathname]);

  if (loading) {
    return <div className="biasi-shell-bg min-h-screen" />;
  }

  if (!isAuthenticated) {
    const isElectron = navigator.userAgent.includes('Electron');
    window.location.replace(isElectron ? 'app://hub.local/' : 'https://biasihub-hub.vercel.app/');
    return (
      <div className="biasi-shell-bg flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#FFC82D]" />
          <p className="text-sm text-[#DCE8FF]">Redirecionando para o Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="biasi-shell-bg biasi-theme relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-0 h-96 w-96 rounded-full bg-[#2E63D5]/20 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#FFC82D]/10 blur-[120px]" />
      </div>

      <Sidebar onAbrirChat={() => setChatAberto(true)} />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <UpdateChecker />
        <div className="absolute right-4 top-3 z-20">
          <NotificacoesDropdown />
        </div>
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <ChatMembros aberto={chatAberto} onFechar={() => setChatAberto(false)} />
    </div>
  );
}
