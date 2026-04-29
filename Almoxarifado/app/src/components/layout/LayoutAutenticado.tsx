import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabase/client';
import { Sidebar } from './Sidebar';
import { UpdateChecker } from './UpdateChecker';
import { NotificacoesDropdown } from '../NotificacoesDropdown';
import { ChatMembros } from '../ChatMembros';

function LoadingScreen({ erroConexao }: { erroConexao: string | null }) {
  const [demorou, setDemorou] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDemorou(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="biasi-shell-bg flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#FFC82D]" />
        <p className="text-sm text-[#DCE8FF]">Carregando sessão...</p>
        {(demorou || erroConexao) && (
          <div className="space-y-3 mt-2">
            <p className="text-xs text-[#9DB2E7] leading-relaxed">
              {erroConexao
                ? erroConexao
                : 'Está demorando mais que o normal. Pode ser instabilidade da rede.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-[#FFC82D]/40 bg-[#FFC82D]/12 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#FFC82D] hover:bg-[#FFC82D] hover:text-slate-900 transition"
            >
              Recarregar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function LayoutAutenticado() {
  const { isAuthenticated, loading, usuario, erroConexao } = useAuth();
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
    return <LoadingScreen erroConexao={erroConexao} />;
  }

  if (!isAuthenticated) {
    const isElectron = navigator.userAgent.includes('Electron');
    const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
    window.location.replace(
      isElectron
        ? 'app://hub.local/'
        : isCapacitor
          ? '/index.html#/'
          : 'https://biasihub-hub.vercel.app/'
    );
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
