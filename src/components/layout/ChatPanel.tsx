import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, Send, Paperclip, Mic, MicOff, Phone, Video,
  File as FileIcon, Volume2, Check, CheckCheck, Smile,
} from 'lucide-react';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuth } from '../../context/AuthContext';

// ── Types ──────────────────────────────────────────────
interface Mensagem {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  conteudo: string | null;
  tipo: 'texto' | 'arquivo' | 'audio' | 'imagem' | 'sistema';
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
  lido_por: string[];
  criado_em: string;
}

interface ChatPanelProps {
  aberto: boolean;
  onFechar: () => void;
  onUnreadChange?: (count: number) => void;
}

// ── Sound helper ───────────────────────────────────────
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZqTjHhxeYOOl5yXjoJ4dH2IkpiblYyBd3R9iJKYm5GMgHd0fYiSmJuRjIB3dH2IkA==';
let _audioCtx: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (!_audioCtx) _audioCtx = new AudioContext();
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // silently fail
  }
}

// ── Helpers ────────────────────────────────────────────
function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarData(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ── Component ──────────────────────────────────────────
export function ChatPanel({ aberto, onFechar, onUnreadChange }: ChatPanelProps) {
  const { usuario } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  // Load messages
  useEffect(() => {
    if (!aberto) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_mensagens')
        .select('*')
        .order('criado_em', { ascending: true })
        .limit(200);
      if (data) {
        setMensagens(data as Mensagem[]);
        scrollToBottom();
      }
    };
    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensagens',
      }, (payload) => {
        const nova = payload.new as Mensagem;
        setMensagens((prev) => {
          if (prev.some((m) => m.id === nova.id)) return prev;
          return [...prev, nova];
        });
        scrollToBottom();

        // Notification sound if from someone else
        if (nova.usuario_id !== usuario?.id) {
          playNotificationSound();
          // Toast notification
          if (Notification.permission === 'granted') {
            new Notification(`${nova.usuario_nome}`, {
              body: nova.conteudo || (nova.tipo === 'audio' ? '🎤 Áudio' : '📎 Arquivo'),
              icon: '/logo-biasi-branco.png',
            });
          }
        }
      })
      .subscribe();

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [aberto, usuario?.id, scrollToBottom]);

  // Unread count
  useEffect(() => {
    if (!usuario?.id) return;
    const unread = mensagens.filter(
      (m) => m.usuario_id !== usuario.id && !(m.lido_por || []).includes(usuario.id)
    ).length;
    onUnreadChange?.(unread);
  }, [mensagens, usuario?.id, onUnreadChange]);

  // Mark messages as read when panel is open
  useEffect(() => {
    if (!aberto || !usuario?.id) return;
    const unread = mensagens.filter(
      (m) => m.usuario_id !== usuario.id && !(m.lido_por || []).includes(usuario.id)
    );
    unread.forEach((m) => {
      supabase
        .from('chat_mensagens')
        .update({ lido_por: [...(m.lido_por || []), usuario.id] })
        .eq('id', m.id)
        .then();
    });
  }, [aberto, mensagens, usuario?.id]);

  // Send text message
  async function enviarTexto() {
    if (!texto.trim() || !usuario || enviando) return;
    setEnviando(true);
    const msg = texto.trim();
    setTexto('');

    await supabase.from('chat_mensagens').insert({
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      conteudo: msg,
      tipo: 'texto',
    });
    setEnviando(false);
    inputRef.current?.focus();
  }

  // Upload file/image
  async function enviarArquivo(file: globalThis.File) {
    if (!usuario) return;
    setUploadingFile(true);

    const ext = file.name.split('.').pop();
    const path = `chat/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('uploads').upload(path, file);
    if (error) {
      console.error('Upload error:', error);
      setUploadingFile(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
    const isImage = file.type.startsWith('image/');

    await supabase.from('chat_mensagens').insert({
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      conteudo: file.name,
      tipo: isImage ? 'imagem' : 'arquivo',
      arquivo_url: urlData.publicUrl,
      arquivo_nome: file.name,
      arquivo_tipo: file.type,
    });
    setUploadingFile(false);
  }

  // Audio recording
  async function toggleGravacao() {
    if (gravandoAudio) {
      mediaRecorderRef.current?.stop();
      setGravandoAudio(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new globalThis.File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        await enviarArquivoAudio(file);
      };

      mediaRecorder.start();
      setGravandoAudio(true);
    } catch {
      console.error('Mic access denied');
    }
  }

  async function enviarArquivoAudio(file: globalThis.File) {
    if (!usuario) return;
    setUploadingFile(true);

    const path = `chat/${file.name}`;
    const { error } = await supabase.storage.from('uploads').upload(path, file);
    if (error) {
      setUploadingFile(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);

    await supabase.from('chat_mensagens').insert({
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      conteudo: '🎤 Áudio',
      tipo: 'audio',
      arquivo_url: urlData.publicUrl,
      arquivo_nome: file.name,
      arquivo_tipo: 'audio/webm',
    });
    setUploadingFile(false);
  }

  // Video call (opens Jitsi Meet room)
  function iniciarVideoCall() {
    const room = `biasi-hub-${Date.now()}`;
    const encodedName = encodeURIComponent(usuario?.nome ?? 'Anfitrião');
    const participantUrl = `https://meet.jit.si/${room}#config.prejoinPageEnabled=false`;
    const hostUrl = `https://meet.jit.si/${room}#userInfo.displayName=%22${encodedName}%22&config.prejoinPageEnabled=false`;
    if (usuario) {
      supabase.from('chat_mensagens').insert({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        conteudo: `📹 ${usuario.nome} iniciou uma videochamada — `,
        tipo: 'sistema',
        arquivo_url: participantUrl,
        arquivo_tipo: 'link/call',
      }).then();
    }
    window.open(hostUrl, '_blank');
  }

  function iniciarVoiceCall() {
    const room = `biasi-hub-voice-${Date.now()}`;
    const encodedName = encodeURIComponent(usuario?.nome ?? 'Anfitrião');
    const participantUrl = `https://meet.jit.si/${room}#config.startWithVideoMuted=true&config.prejoinPageEnabled=false`;
    const hostUrl = `https://meet.jit.si/${room}#config.startWithVideoMuted=true&userInfo.displayName=%22${encodedName}%22&config.prejoinPageEnabled=false`;
    if (usuario) {
      supabase.from('chat_mensagens').insert({
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        conteudo: `📞 ${usuario.nome} iniciou uma chamada de voz — `,
        tipo: 'sistema',
        arquivo_url: participantUrl,
        arquivo_tipo: 'link/call',
      }).then();
    }
    window.open(hostUrl, '_blank');
  }

  // Group by date
  function getDateKey(iso: string) {
    return new Date(iso).toDateString();
  }

  if (!aberto) return null;

  const grouped: { date: string; msgs: Mensagem[] }[] = [];
  let currentDate = '';
  for (const m of mensagens) {
    const dk = getDateKey(m.criado_em);
    if (dk !== currentDate) {
      currentDate = dk;
      grouped.push({ date: m.criado_em, msgs: [m] });
    } else {
      grouped[grouped.length - 1].msgs.push(m);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-600 to-blue-700 text-white">
        <div className="flex items-center gap-2">
          <Volume2 size={18} />
          <h2 className="text-sm font-semibold">Chat da Equipe</h2>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
            {mensagens.length} msgs
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={iniciarVoiceCall}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="Chamada de voz"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={iniciarVideoCall}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="Chamada de vídeo"
          >
            <Video size={16} />
          </button>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 bg-slate-50">
        {grouped.map((g, gi) => (
          <div key={gi}>
            {/* Date separator */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
                {formatarData(g.date)}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {g.msgs.map((m) => {
              const isMe = m.usuario_id === usuario?.id;
              const isSistema = m.tipo === 'sistema';

              if (isSistema) {
                return (
                  <div key={m.id} className="flex justify-center my-2">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-xs text-blue-700 max-w-[85%] text-center">
                      {m.conteudo}
                      {m.arquivo_url && (
                        <a
                          href={m.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 underline font-medium"
                        >
                          Entrar na chamada
                        </a>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm'
                  }`}>
                    {!isMe && (
                      <p className="text-[10px] font-semibold mb-0.5 text-blue-600">
                        {m.usuario_nome}
                      </p>
                    )}

                    {m.tipo === 'texto' && (
                      <p className="text-sm whitespace-pre-wrap break-words">{m.conteudo}</p>
                    )}

                    {m.tipo === 'imagem' && m.arquivo_url && (
                      <div>
                        <img
                          src={m.arquivo_url}
                          alt={m.arquivo_nome || 'imagem'}
                          className="rounded-lg max-w-full max-h-48 cursor-pointer"
                          onClick={() => window.open(m.arquivo_url!, '_blank')}
                        />
                      </div>
                    )}

                    {m.tipo === 'arquivo' && m.arquivo_url && (
                      <a
                        href={m.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-sm ${isMe ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        <FileIcon size={16} />
                        <span className="truncate underline">{m.arquivo_nome || 'Arquivo'}</span>
                      </a>
                    )}

                    {m.tipo === 'audio' && m.arquivo_url && (
                      <audio controls className="max-w-full h-8" preload="metadata">
                        <source src={m.arquivo_url} type="audio/webm" />
                      </audio>
                    )}

                    <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : ''}`}>
                      <span className={`text-[9px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {formatarHora(m.criado_em)}
                      </span>
                      {isMe && (
                        (m.lido_por || []).length > 1
                          ? <CheckCheck size={11} className="text-blue-200" />
                          : <Check size={11} className="text-blue-300" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {mensagens.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Smile size={32} />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">Envie a primeira mensagem!</p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 px-3 py-2 bg-white">
        {uploadingFile && (
          <div className="text-xs text-blue-600 mb-1 flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Enviando arquivo...
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {/* File attach */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) enviarArquivo(f);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Enviar arquivo"
          >
            <Paperclip size={18} />
          </button>

          {/* Audio record */}
          <button
            onClick={toggleGravacao}
            className={`p-2 rounded-lg transition-colors ${
              gravandoAudio 
                ? 'text-red-600 bg-red-50 animate-pulse' 
                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title={gravandoAudio ? 'Parar gravação' : 'Gravar áudio'}
          >
            {gravandoAudio ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }}
            placeholder="Digite uma mensagem..."
            className="flex-1 text-sm border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />

          {/* Send */}
          <button
            onClick={enviarTexto}
            disabled={!texto.trim() || enviando}
            className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
