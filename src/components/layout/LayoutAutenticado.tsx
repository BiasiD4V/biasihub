import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { SidebarAutenticada } from './SidebarAutenticada';
import { PauloAjuda } from './PauloAjuda';
import { ChatMembros } from '../ChatMembros';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabase/client';
import { ChevronsLeft, ChevronsRight, Menu, X, Phone, Video, PhoneOff } from 'lucide-react';
import { UpdateChecker } from './UpdateChecker';

const STORAGE_KEY_SIDEBAR_HIDDEN = 'layout-sidebar-hidden-v1';
const CALL_WINDOW_NAME = 'biasi-hub-call';

export function LayoutAutenticado() {
  const { isAuthenticated, loading, erroConexao, usuario } = useAuth();
  const [authTimeout, setAuthTimeout] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [sidebarOcultaDesktop, setSidebarOcultaDesktop] = useState(false);
  const [pauloAberto, setPauloAberto] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [toastNotif, setToastNotif] = useState<{ nome: string; conteudo: string; canal?: string } | null>(null);
  const [callNotif, setCallNotif] = useState<{ nome: string; url: string; tipo: 'voz' | 'video' } | null>(null);
  const [biraNotif, setBiraNotif] = useState<{ codigo: string; titulo: string; acao: 'nova' | 'atribuida' } | null>(null);
  const chatAbertoRef = useRef(chatAberto);
  const canaisDoUsuarioRef = useRef<Set<string>>(new Set());
  const ultimoCountRef = useRef(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const biraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringtoneRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    chatAbertoRef.current = chatAberto;
  }, [chatAberto]);

  useEffect(() => {
    if (!usuario?.id) return;
    setMensagensNaoLidas(0);
  }, [usuario?.id]);

  useEffect(() => {
    if (!chatAberto) return;
    setMensagensNaoLidas(0);
  }, [chatAberto]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Toca som quando a contagem de não lidas aumenta
  useEffect(() => {
    if (mensagensNaoLidas > ultimoCountRef.current) {
      tocarSomNotificacao();
    }
    ultimoCountRef.current = mensagensNaoLidas;
  }, [mensagensNaoLidas]);

  // WhatsApp-style whistle notification
  function tocarSomNotificacao() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      // Nota 1 - sweep up
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(560, t);
      o1.frequency.exponentialRampToValueAtTime(880, t + 0.12);
      o1.connect(gain);
      o1.start(t);
      o1.stop(t + 0.12);

      // Nota 2 - higher   
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(880, t + 0.15);
      o2.frequency.exponentialRampToValueAtTime(1175, t + 0.30);
      o2.connect(gain);
      o2.start(t + 0.15);
      o2.stop(t + 0.30);

      // Envelope
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
      gain.gain.setValueAtTime(0.35, t + 0.10);
      gain.gain.linearRampToValueAtTime(0, t + 0.13);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.18);
      gain.gain.setValueAtTime(0.35, t + 0.27);
      gain.gain.linearRampToValueAtTime(0, t + 0.32);
    } catch {
      // silently fail
    }
  }

  // Ringtone for incoming calls (loops until stopped)
  function tocarRingtone(): { stop: () => void } {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let stopped = false;
      let timeouts: ReturnType<typeof setTimeout>[] = [];

      function ring(offset: number) {
        if (stopped) return;
        const t = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        // Ring tone - two-tone pattern like a phone
        const freqs = [440, 480];
        freqs.forEach(f => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);
          osc.connect(gain);
          osc.start(t);
          osc.stop(t + 0.8);
        });

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.setValueAtTime(0.25, t + 0.75);
        gain.gain.linearRampToValueAtTime(0, t + 0.8);

        // Repeat every 2s
        const tid = setTimeout(() => ring(offset + 2000), 2000);
        timeouts.push(tid);
      }

      ring(0);

      return {
        stop: () => {
          stopped = true;
          timeouts.forEach(clearTimeout);
          ctx.close().catch(() => {});
        }
      };
    } catch {
      return { stop: () => {} };
    }
  }

  function fecharCallNotif() {
    setCallNotif(null);
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
  }

  function notificarBira(payload: { codigo?: string | null; titulo?: string | null; acao: 'nova' | 'atribuida' }) {
    const codigo = (payload.codigo || 'BIRA').trim();
    const titulo = (payload.titulo || 'Tarefa atribuida').trim();
    setBiraNotif({ codigo, titulo, acao: payload.acao });
    if (biraTimeoutRef.current) clearTimeout(biraTimeoutRef.current);
    biraTimeoutRef.current = setTimeout(() => setBiraNotif(null), 5000);
    tocarSomNotificacao();

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification('Bira - Nova atribuicao', {
          body: `${codigo}: ${titulo}`,
          icon: '/logo-biasi.png',
          tag: `bira-${codigo}`,
        });
        n.onclick = () => {
          window.focus();
          window.location.pathname = '/bira';
          n.close();
        };
        setTimeout(() => n.close(), 6000);
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    if (!usuario?.id) return;
    const userId = usuario.id;

    let active = true;

    async function carregarCanaisDoUsuario() {
      const { data } = await supabase
        .from('chat_membros')
        .select('canal_id')
        .eq('usuario_id', userId);

      canaisDoUsuarioRef.current = new Set(
        (data ?? []).map((row: any) => row.canal_id).filter(Boolean)
      );
    }

    function mensagemContaParaBadge(nova: {
      canal: string;
      remetente_id: string;
      destinatario_id: string | null;
      tipo?: string | null;
      canal_id?: string | null;
    }): boolean {
      if (!nova || nova.remetente_id === userId || nova.tipo === 'reacao') return false;
      if (chatAbertoRef.current) return false;

      const ehDmParaMim = nova.canal === 'dm' && nova.destinatario_id === userId;
      const ehCanalV2 = !!nova.canal_id && canaisDoUsuarioRef.current.has(nova.canal_id);
      const ehGeralLegado = !nova.canal_id && nova.canal === 'geral';

      return ehDmParaMim || ehCanalV2 || ehGeralLegado;
    }

    carregarCanaisDoUsuario();

    const channel = supabase
      .channel(`chat-unread-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensagens' },
        (payload) => {
          const nova = payload.new as {
            canal: string;
            remetente_id: string;
            remetente_nome: string;
            destinatario_id: string | null;
            conteudo: string;
            arquivo_nome: string | null;
            tipo?: string | null;
            canal_id?: string | null;
          };

          if (!mensagemContaParaBadge(nova)) return;

          const ehCanalV2 = !!nova.canal_id && canaisDoUsuarioRef.current.has(nova.canal_id);
          const ehMensagemGeral = nova.canal === 'geral' || (nova.canal === 'canal' && ehCanalV2);
          const ehDmParaMim = nova.canal === 'dm' && nova.destinatario_id === usuario.id;

          if (ehMensagemGeral || ehDmParaMim) {
            // Check if it's a call (works for both DM and group)
            const ehChamada = (nova as any).arquivo_tipo === 'link/call';

            if (ehChamada) {
              const ehVideo = nova.conteudo?.includes('vídeo') || nova.conteudo?.includes('videochamada');
              setCallNotif({
                nome: nova.remetente_nome,
                url: (nova as any).arquivo_url,
                tipo: ehVideo ? 'video' : 'voz',
              });
              ringtoneRef.current?.stop();
              ringtoneRef.current = tocarRingtone();
              if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = setTimeout(() => fecharCallNotif(), 30000);
            } else {
              if (active) {
                setMensagensNaoLidas((prev) => Math.min(prev + 1, 99));
              }
              const preview = nova.conteudo?.trim() || nova.arquivo_nome || 'arquivo anexado';
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              setToastNotif({ nome: nova.remetente_nome, conteudo: preview, canal: nova.canal });
              toastTimeoutRef.current = setTimeout(() => setToastNotif(null), 4000);

              // Browser push notification when tab is not focused
              if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  const notifTitle = ehMensagemGeral ? `#Geral · ${nova.remetente_nome}` : nova.remetente_nome;
                  const n = new Notification(notifTitle, {
                    body: preview.length > 60 ? preview.slice(0, 60) + '...' : preview,
                    icon: '/logo-biasi.png',
                    tag: 'biasi-chat-' + nova.remetente_id,
                  });
                  n.onclick = () => { window.focus(); setChatAberto(true); n.close(); };
                  setTimeout(() => n.close(), 5000);
                } catch { /* ignore */ }
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_membros' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { usuario_id?: string } | undefined;
          if (row?.usuario_id === userId) {
            carregarCanaisDoUsuario();
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      ringtoneRef.current?.stop();
    };
  }, [usuario?.id]);

  // Notificacao de tarefa atribuida no Bira
  useEffect(() => {
    if (!usuario?.id) return;
    const userId = usuario.id;

    const biraChannel = supabase
      .channel(`bira-atribuicoes-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bira_tarefas', filter: `responsavel_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { codigo?: string | null; titulo?: string | null };
          notificarBira({ codigo: row.codigo, titulo: row.titulo, acao: 'nova' });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bira_tarefas', filter: `responsavel_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { codigo?: string | null; titulo?: string | null; responsavel_id?: string | null };
          const oldRow = (payload.old || {}) as { responsavel_id?: string | null };
          if (oldRow.responsavel_id === userId) return;
          notificarBira({ codigo: row.codigo, titulo: row.titulo, acao: 'atribuida' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(biraChannel);
      if (biraTimeoutRef.current) clearTimeout(biraTimeoutRef.current);
    };
  }, [usuario?.id]);

  // â”€â”€ Presença global (registra online para todos os usuários autenticados) â”€â”€
  useEffect(() => {
    if (!usuario?.id) return;

    function registrarOnline() {
      supabase.from('presenca_usuarios').upsert({
        user_id: usuario!.id,
        esta_online: true,
        ultimo_heartbeat: new Date().toISOString(),
        ultima_entrada: new Date().toISOString(),
      }, { onConflict: 'user_id' }).then();
    }

    registrarOnline();

    // Heartbeat a cada 30s para manter staleness check do servidor OK
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'hidden') return; // não gasta heartbeat se aba está oculta
      supabase.from('presenca_usuarios').update({
        esta_online: true,
        ultimo_heartbeat: new Date().toISOString(),
      }).eq('user_id', usuario.id).then();
    }, 30000);

    function marcarOffline() {
      supabase.from('presenca_usuarios').update({
        esta_online: false,
        ultimo_heartbeat: new Date().toISOString(),
        ultima_entrada: null,
      }).eq('user_id', usuario!.id).then();
    }

    // visibilitychange: marca offline ao ocultar aba, online ao voltar
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        marcarOffline();
      } else {
        registrarOnline();
      }
    }

    window.addEventListener('beforeunload', marcarOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', marcarOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [usuario?.id, usuario?.nome]);

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

  useEffect(() => {
    if (!loading) {
      setAuthTimeout(false);
      return;
    }

    // Aumentando o limite de visualização de timeout na tela para 30s (ajuda na rede no modo dev)
    const timer = setTimeout(() => setAuthTimeout(true), 30000);
    return () => clearTimeout(timer);
  }, [loading]);

  const fecharSidebar = () => setSidebarAberta(false);

  function limparSessaoLocal() {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes('remember_me') || key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.removeItem('biasi-hub-pwa-reset-v1');
  }

  if (loading) {
    if (authTimeout) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-800">Sessao travada no carregamento</h2>
            <p className="text-sm text-slate-600 mt-2">
              A autenticacao passou do tempo esperado. Redirecionando para o login limpo...
            </p>
            <div className="mt-5 flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Tentar de novo
              </button>
              <button
                onClick={() => {
                  limparSessaoLocal();
                  window.location.replace('/login');
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Ir para login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="biasi-shell-bg biasi-theme relative flex min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-[#2E63D5]/20 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#FFC82D]/10 blur-[120px]" />
      </div>
      {/* Top bar mobile */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-12 items-center gap-3 border-b border-[#32579D] bg-[#102556]/90 px-3 shadow-lg backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarAberta(true)}
          className="relative rounded-lg p-1.5 text-white hover:bg-white/10"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
          {mensagensNaoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {mensagensNaoLidas > 99 ? '99+' : mensagensNaoLidas}
            </span>
          )}
        </button>
        <img src="/logo-branco.svg" alt="Biasi" className="h-6 w-auto" />
      </div>

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
          className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-[#4469B1] bg-[#132a5f] text-white shadow-lg transition-colors hover:bg-[#1A356E] lg:flex fixed top-4 left-3 z-40"
          aria-label="Mostrar menu lateral"
          title="Mostrar menu"
        >
          <ChevronsRight size={16} />
          {mensagensNaoLidas > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none border border-white">
              {mensagensNaoLidas > 99 ? '99+' : mensagensNaoLidas}
            </span>
          )}
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
          className="absolute right-3 top-4 z-[60] hidden h-8 w-8 items-center justify-center rounded-full border border-[#4469B1] bg-[#132a5f] text-[#DCE8FF] shadow-md transition-colors hover:bg-[#1A356E] hover:text-white lg:flex"
          aria-label="Ocultar menu lateral"
          title="Ocultar menu"
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          onClick={fecharSidebar}
          className="absolute right-3 top-4 z-[60] rounded-lg p-2 text-[#DCE8FF] transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Fechar menu"
        >
          <X size={22} />
        </button>
        <SidebarAutenticada
          onNavigate={fecharSidebar}
          onAbrirPaulo={() => setPauloAberto(true)}
          onAbrirChat={() => setChatAberto(true)}
          unreadCount={mensagensNaoLidas}
        />
      </div>

      {/* Conteúdo principal */}
      <main className={`relative z-10 flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden pt-12 lg:pt-0 ${sidebarOcultaDesktop ? 'lg:pl-0' : 'lg:pl-64'}`}>
        {/* Banner de atualização (Desktop: redireciona para Hub) */}
        <UpdateChecker />
        <Outlet />
      </main>

      <PauloAjuda forceOpen={pauloAberto} onClose={() => setPauloAberto(false)} />
      <ChatMembros aberto={chatAberto} onFechar={() => setChatAberto(false)} />

      {/* Toast de nova mensagem */}
      {toastNotif && (
        <div
          className="fixed bottom-20 right-4 z-[200] flex items-center gap-3 bg-slate-900 text-white pl-3 pr-2 py-2.5 rounded-2xl shadow-2xl border border-slate-700 cursor-pointer max-w-[280px]"
          style={{ animation: 'slideInRight 0.2s ease-out' }}
          onClick={() => { setChatAberto(true); setToastNotif(null); if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); }}
        >
          <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold">{toastNotif.nome.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight truncate">{toastNotif.canal === 'geral' ? `#Geral · ${toastNotif.nome}` : toastNotif.nome}</p>
            <p className="text-[11px] text-slate-300 leading-tight truncate mt-0.5">{toastNotif.conteudo}</p>
          </div>
          <button
            className="p-1 text-slate-400 hover:text-white flex-shrink-0 rounded-lg hover:bg-slate-700"
            onClick={(e) => { e.stopPropagation(); setToastNotif(null); if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {biraNotif && (
        <div
          className="fixed bottom-40 right-4 z-[210] flex items-center gap-3 bg-gradient-to-r from-indigo-700 to-blue-700 text-white pl-3 pr-2 py-2.5 rounded-2xl shadow-2xl border border-indigo-400/40 cursor-pointer max-w-[320px]"
          style={{ animation: 'slideInRight 0.2s ease-out' }}
          onClick={() => { window.location.pathname = '/bira'; setBiraNotif(null); if (biraTimeoutRef.current) clearTimeout(biraTimeoutRef.current); }}
        >
          <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-black">B</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight truncate">
              {biraNotif.acao === 'nova' ? 'Nova tarefa no Bira' : 'Tarefa atribuida para voce'}
            </p>
            <p className="text-[11px] text-white/90 leading-tight truncate mt-0.5">
              {biraNotif.codigo}: {biraNotif.titulo}
            </p>
          </div>
          <button
            className="p-1 text-white/80 hover:text-white flex-shrink-0 rounded-lg hover:bg-white/15"
            onClick={(e) => { e.stopPropagation(); setBiraNotif(null); if (biraTimeoutRef.current) clearTimeout(biraTimeoutRef.current); }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* UpdateChecker movido para dentro de <main> */}

      {/* Incoming call notification */}
      {callNotif && (
        <div
          className="fixed inset-x-0 top-0 z-[300] flex justify-center"
          style={{ animation: 'slideDownCall 0.3s ease-out' }}
        >
          <div className="mx-4 mt-4 sm:mx-auto sm:max-w-sm w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
            <div className="px-5 pt-5 pb-4 text-center">
              <div className="relative mx-auto w-16 h-16 mb-3">
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
                <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">{callNotif.nome.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <p className="font-semibold text-base">{callNotif.nome}</p>
              <p className="text-sm text-slate-400 mt-0.5">
                {callNotif.tipo === 'video' ? 'Videochamada recebida' : 'Chamada de voz recebida'}
              </p>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => fecharCallNotif()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium text-sm"
              >
                <PhoneOff size={16} />
                Recusar
              </button>
              <button
                onClick={() => {
                  const callWindow = window.open(callNotif.url, CALL_WINDOW_NAME);
                  callWindow?.focus();
                  fecharCallNotif();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium text-sm shadow-lg shadow-emerald-500/30"
              >
                {callNotif.tipo === 'video' ? <Video size={16} /> : <Phone size={16} />}
                Atender
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideDownCall {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}




