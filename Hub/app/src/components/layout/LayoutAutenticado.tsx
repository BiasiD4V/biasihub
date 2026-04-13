import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabase/client';
import { Sidebar } from './Sidebar';
import { ChatMembros } from '../ChatMembros';
import { motion, AnimatePresence } from 'framer-motion';

export function LayoutAutenticado() {
  const { isAuthenticated, loading, usuario } = useAuth();
  const location = useLocation();
  const [chatAberto, setChatAberto] = useState(false);

  // Heartbeat de presença
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Background Gradients for Loading */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-600/10 rounded-full blur-[120px] animate-pulse" />

        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="w-16 h-16 border-4 border-white/5 border-t-sky-400 rounded-full animate-spin shadow-[0_0_20px_rgba(56,189,248,0.3)]" />
          <div className="text-center">
             <p className="text-[10px] font-black text-white uppercase tracking-[0.5em] animate-pulse">Sincronizando Nucleo</p>
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">BiasiHub Singularity Edition</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="biasi-theme flex h-screen overflow-hidden selection:bg-sky-500 selection:text-white font-black relative bg-slate-950">
      {/* Global Singularity Background Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-sky-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-slate-900/40 rounded-full blur-[120px]" />
      </div>

      <Sidebar chatAberto={chatAberto} onAbrirChat={() => setChatAberto(true)} />
      
      <main className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative z-10">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <ChatMembros aberto={chatAberto} onFechar={() => setChatAberto(false)} />
    </div>
  );
}
