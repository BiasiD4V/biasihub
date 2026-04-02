import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Send, Hash, ArrowLeft, Paperclip, CornerUpLeft, CheckCheck, Mic, Square, Phone, Video } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

interface Membro {
  id: string;
  nome: string;
  email: string;
  esta_online: boolean;
}

interface Mensagem {
  id: string;
  remetente_id: string;
  remetente_nome: string;
  destinatario_id: string | null;
  canal: string;
  conteudo: string;
  criado_em: string;
  lido: boolean;
  resposta_id: string | null;
  resposta_remetente_nome: string | null;
  resposta_conteudo: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
}

interface ChatMembrosProps {
  aberto: boolean;
  onFechar: () => void;
}

export function ChatMembros({ aberto, onFechar }: ChatMembrosProps) {
  const { usuario } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [canalAtivo, setCanalAtivo] = useState<string>('geral');
  const [dmAtivo, setDmAtivo] = useState<Membro | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(true);
  const [naoLidasPorConta, setNaoLidasPorConta] = useState<Set<string>>(new Set());
  const [respostaParaMsg, setRespostaParaMsg] = useState<Mensagem | null>(null);
  const [quemDigitando, setQuemDigitando] = useState<string | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [duracaoGravacao, setDuracaoGravacao] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const canalAtivoRef = useRef(canalAtivo);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const gravacaoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { canalAtivoRef.current = canalAtivo; }, [canalAtivo]);

  // Typing broadcast channel
  useEffect(() => {
    if (!aberto || !usuario) return;
    const tc = supabase.channel('chat-digitando-broadcast');
    typingChannelRef.current = tc;
    tc.on('broadcast', { event: 'digitando' }, ({ payload }) => {
      if (payload.user_id === usuario.id) return;
      if (payload.canal !== canalAtivoRef.current) return;
      setQuemDigitando(payload.user_nome as string);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setQuemDigitando(null), 3000);
    }).subscribe();
    return () => {
      supabase.removeChannel(tc);
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [aberto, usuario]);

  // Cleanup gravação ao fechar
  useEffect(() => {
    if (!aberto) {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      if (gravacaoTimerRef.current) clearInterval(gravacaoTimerRef.current);
      setGravando(false);
      setDuracaoGravacao(0);
    }
  }, [aberto]);

  useEffect(() => { setQuemDigitando(null); }, [canalAtivo]);

  useEffect(() => {
    if (!aberto || !usuario) return;
    async function fetchMembros() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch('/api/membros-lista', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json() as Array<{
          id: string; nome: string; email: string;
          esta_online: boolean; ativo: boolean;
        }>;
        setMembros(
          data
            .filter(m => m.ativo && m.id !== usuario?.id)
            .map(m => ({ id: m.id, nome: m.nome, email: m.email, esta_online: m.esta_online }))
        );
      } catch {
        // silently fail
      }
    }
    fetchMembros();
  }, [aberto, usuario]);

  const carregarMensagens = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);

    let query = supabase
      .from('chat_mensagens')
      .select('*')
      .order('criado_em', { ascending: true })
      .limit(100);

    if (canalAtivo === 'geral') {
      query = query.eq('canal', 'geral');
    } else if (dmAtivo) {
      query = query.eq('canal', 'dm').or(
        `and(remetente_id.eq.${usuario.id},destinatario_id.eq.${dmAtivo.id}),and(remetente_id.eq.${dmAtivo.id},destinatario_id.eq.${usuario.id})`
      );
    }

    const { data, error } = await query;
    if (!error && data) {
      setMensagens(data);
    }
    setCarregando(false);
  }, [usuario, canalAtivo, dmAtivo]);

  useEffect(() => {
    if (!aberto || !usuario) return;
    carregarMensagens();
  }, [aberto, carregarMensagens, usuario]);

  // Realtime subscription
  useEffect(() => {
    if (!aberto || !usuario) return;

    const channel = supabase
      .channel('chat-realtime-v2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensagens' },
        (payload) => {
          const nova = payload.new as Mensagem;
          if (canalAtivo === 'geral' && nova.canal === 'geral') {
            setMensagens(prev => [...prev, nova]);
          } else if (dmAtivo && nova.canal === 'dm') {
            const isMyDm =
              (nova.remetente_id === usuario.id && nova.destinatario_id === dmAtivo.id) ||
              (nova.remetente_id === dmAtivo.id && nova.destinatario_id === usuario.id);
            if (isMyDm) {
              if (nova.destinatario_id === usuario.id) {
                setMensagens(prev => [...prev, { ...nova, lido: true }]);
                supabase.from('chat_mensagens').update({ lido: true }).eq('id', nova.id).then();
              } else {
                setMensagens(prev => [...prev, nova]);
              }
            }
          }
          if (nova.canal === 'dm' && nova.destinatario_id === usuario.id && nova.remetente_id !== usuario.id) {
            setNaoLidasPorConta(prev => new Set(prev).add(nova.remetente_id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_mensagens', filter: `remetente_id=eq.${usuario.id}` },
        (payload) => {
          const updated = payload.new as Mensagem;
          setMensagens(prev => prev.map(m => m.id === updated.id ? { ...m, lido: updated.lido } : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [aberto, usuario, canalAtivo, dmAtivo]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, quemDigitando]);

  const dmAtivoId = dmAtivo?.id;
  const usuarioId = usuario?.id;
  useEffect(() => {
    if (!dmAtivoId || !usuarioId) return;
    supabase
      .from('chat_mensagens')
      .update({ lido: true })
      .eq('canal', 'dm')
      .eq('remetente_id', dmAtivoId)
      .eq('destinatario_id', usuarioId)
      .eq('lido', false)
      .then();
  }, [dmAtivoId, usuarioId]);

  function handleTextoChange(val: string) {
    setTexto(val);
    try {
      typingChannelRef.current?.send({
        type: 'broadcast',
        event: 'digitando',
        payload: { user_id: usuario?.id, user_nome: usuario?.nome, canal: canalAtivoRef.current },
      });
    } catch { /* ignore */ }
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: mimeType });
        await enviarArquivo(file);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setGravando(true);
      setDuracaoGravacao(0);
      gravacaoTimerRef.current = setInterval(() => setDuracaoGravacao(d => d + 1), 1000);
    } catch { /* permissão negada */ }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setGravando(false);
    if (gravacaoTimerRef.current) { clearInterval(gravacaoTimerRef.current); gravacaoTimerRef.current = null; }
    setDuracaoGravacao(0);
  }

  function cancelarGravacao() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setGravando(false);
    if (gravacaoTimerRef.current) { clearInterval(gravacaoTimerRef.current); gravacaoTimerRef.current = null; }
    setDuracaoGravacao(0);
  }

  async function enviarArquivo(file: File) {
    if (!usuario) return;
    setEnviandoArquivo(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${usuario.id}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('chat-arquivos').upload(path, file, { upsert: true });
      if (error || !data) throw error;
      const { data: urlData } = supabase.storage.from('chat-arquivos').getPublicUrl(data.path);
      const msg: Record<string, unknown> = {
        remetente_id: usuario.id,
        remetente_nome: usuario.nome,
        conteudo: '',
        canal: canalAtivo === 'geral' ? 'geral' : 'dm',
        arquivo_url: urlData.publicUrl,
        arquivo_nome: file.name,
        arquivo_tipo: file.type,
      };
      if (dmAtivo && canalAtivo !== 'geral') msg.destinatario_id = dmAtivo.id;
      await supabase.from('chat_mensagens').insert(msg);
    } catch { /* ignore */ }
    setEnviandoArquivo(false);
  }

  async function enviarMensagem() {
    if (!texto.trim() || !usuario) return;

    const msg: Record<string, unknown> = {
      remetente_id: usuario.id,
      remetente_nome: usuario.nome,
      conteudo: texto.trim(),
      canal: canalAtivo === 'geral' ? 'geral' : 'dm',
    };

    if (dmAtivo && canalAtivo !== 'geral') {
      msg.destinatario_id = dmAtivo.id;
    }

    if (respostaParaMsg) {
      msg.resposta_id = respostaParaMsg.id;
      msg.resposta_remetente_nome = respostaParaMsg.remetente_nome;
      msg.resposta_conteudo = respostaParaMsg.conteudo || respostaParaMsg.arquivo_nome || '📎 arquivo';
    }

    const { error } = await supabase.from('chat_mensagens').insert(msg);
    if (!error) {
      setTexto('');
      setRespostaParaMsg(null);
    }
  }

  function abrirCanal(tipo: 'geral') {
    setCanalAtivo(tipo);
    setDmAtivo(null);
    setMostrarLista(false);
    setRespostaParaMsg(null);
  }

  function abrirDM(membro: Membro) {
    setDmAtivo(membro);
    setCanalAtivo(`dm-${membro.id}`);
    setMostrarLista(false);
    setRespostaParaMsg(null);
    setNaoLidasPorConta(prev => {
      const nova = new Set(prev);
      nova.delete(membro.id);
      return nova;
    });
  }

  function iniciarLigacao() {
    const room = `biasi-${canalAtivo}-${Date.now()}`;
    const url = `https://meet.jit.si/${room}#config.startWithVideoMuted=true`;
    if (usuario) {
      supabase.from('chat_mensagens').insert({
        remetente_id: usuario.id,
        remetente_nome: usuario.nome,
        conteudo: `📞 ${usuario.nome} iniciou uma chamada de voz — `,
        canal: canalAtivo === 'geral' ? 'geral' : 'dm',
        arquivo_url: url,
        arquivo_nome: 'Entrar na chamada',
        arquivo_tipo: 'link/call',
        ...(dmAtivo ? { destinatario_id: dmAtivo.id } : {}),
      }).then();
    }
    window.open(url, '_blank');
  }

  function iniciarVideoCall() {
    const room = `biasi-video-${canalAtivo}-${Date.now()}`;
    const url = `https://meet.jit.si/${room}`;
    if (usuario) {
      supabase.from('chat_mensagens').insert({
        remetente_id: usuario.id,
        remetente_nome: usuario.nome,
        conteudo: `📹 ${usuario.nome} iniciou uma videochamada — `,
        canal: canalAtivo === 'geral' ? 'geral' : 'dm',
        arquivo_url: url,
        arquivo_nome: 'Entrar na chamada',
        arquivo_tipo: 'link/call',
        ...(dmAtivo ? { destinatario_id: dmAtivo.id } : {}),
      }).then();
    }
    window.open(url, '_blank');
  }

  function voltarParaLista() {
    setMostrarLista(true);
    setDmAtivo(null);
    setCanalAtivo('geral');
    setRespostaParaMsg(null);
  }

  if (!aberto) return null;

  const outrosMembros = membros.filter(m => m.id !== usuario?.id);
  const ultimaMinhaMensagemId = [...mensagens].reverse().find(m => m.remetente_id === usuario?.id)?.id;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-96 h-[100dvh] sm:h-[580px] bg-white sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {!mostrarLista && (
            <button onClick={voltarParaLista} className="p-1 rounded hover:bg-slate-700 mr-1">
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="font-semibold text-sm">
            {mostrarLista
              ? 'Chat da Equipe'
              : dmAtivo
                ? dmAtivo.nome
                : '# Geral'}
          </span>
          {dmAtivo && (
            <span className={`w-2 h-2 rounded-full ${dmAtivo.esta_online ? 'bg-green-400' : 'bg-slate-500'}`} />
          )}
        </div>
        {!mostrarLista && (
          <div className="flex items-center gap-0.5">
            <button onClick={iniciarLigacao} className="p-1.5 rounded hover:bg-slate-700" title="Chamada de voz">
              <Phone size={14} />
            </button>
            <button onClick={iniciarVideoCall} className="p-1.5 rounded hover:bg-slate-700" title="Videochamada">
              <Video size={14} />
            </button>
          </div>
        )}
        <button onClick={onFechar} className="p-1 rounded hover:bg-slate-700">
          <X size={18} />
        </button>
      </div>

      {mostrarLista ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Canais</p>
            <button
              onClick={() => abrirCanal('geral')}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <Hash size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Geral</span>
            </button>
          </div>

          <div className="p-3 pt-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Mensagens Diretas</p>
            <div className="space-y-0.5">
              {outrosMembros.map(m => (
                <button
                  key={m.id}
                  onClick={() => abrirDM(m)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{m.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${m.esta_online ? 'bg-green-500' : 'bg-slate-300'}`} />
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{m.nome}</p>
                      <p className="text-[10px] text-slate-400">{m.esta_online ? 'Online' : 'Offline'}</p>
                    </div>
                    {naoLidasPorConta.has(m.id) && (
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
              {outrosMembros.length === 0 && (
                <p className="text-xs text-slate-400 px-3 py-2">Nenhum membro disponível</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {carregando ? (
              <div className="text-center text-slate-400 text-sm py-8">Carregando...</div>
            ) : mensagens.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">
                Nenhuma mensagem ainda. Seja o primeiro!
              </div>
            ) : (
              mensagens.map(msg => {
                const isMine = msg.remetente_id === usuario?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isMine ? 'order-2' : ''}`}>
                      {!isMine && (
                        <p className="text-[10px] font-medium text-slate-500 mb-0.5 ml-1">{msg.remetente_nome}</p>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-800 rounded-bl-md'
                      }`}>
                        {/* Reply preview */}
                        {msg.resposta_conteudo && (
                          <div className={`text-[10px] mb-1.5 px-2 py-1 rounded-lg border-l-2 ${
                            isMine
                              ? 'bg-blue-500/50 border-blue-300 text-blue-100'
                              : 'bg-slate-200 border-slate-400 text-slate-600'
                          }`}>
                            <p className="font-bold truncate">{msg.resposta_remetente_nome}</p>
                            <p className="truncate">{msg.resposta_conteudo}</p>
                          </div>
                        )}
                        {/* File attachment */}
                        {msg.arquivo_url && (
                          msg.arquivo_tipo?.startsWith('image/')
                            ? (
                              <img
                                src={msg.arquivo_url}
                                alt={msg.arquivo_nome ?? 'imagem'}
                                className="max-w-full rounded-lg mb-1 max-h-48 object-cover cursor-pointer"
                                onClick={() => window.open(msg.arquivo_url!, '_blank')}
                              />
                            ) : msg.arquivo_tipo?.startsWith('audio/')
                            ? (
                              <audio
                                src={msg.arquivo_url}
                                controls
                                className="max-w-full rounded-lg"
                                style={{ height: '36px', minWidth: '180px' }}
                              />
                            ) : msg.arquivo_tipo === 'link/call'
                            ? (
                              <a
                                href={msg.arquivo_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${isMine ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                              >
                                {msg.conteudo?.includes('vídeo') ? <Video size={12} /> : <Phone size={12} />}
                                {msg.arquivo_nome}
                              </a>
                            ) : (
                              <a
                                href={msg.arquivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1.5 text-xs underline ${isMine ? 'text-blue-200' : 'text-blue-600'}`}
                              >
                                <Paperclip size={11} />
                                {msg.arquivo_nome}
                              </a>
                            )
                        )}
                        {/* Text content */}
                        {msg.conteudo && <span>{msg.conteudo}</span>}
                      </div>
                      {/* Time row */}
                      <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end mr-1' : 'ml-1'}`}>
                        <button
                          onClick={() => setRespostaParaMsg(msg)}
                          className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
                          title="Responder"
                        >
                          <CornerUpLeft size={10} />
                        </button>
                        <p className="text-[10px] text-slate-400">
                          {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isMine && dmAtivo && msg.id === ultimaMinhaMensagemId && msg.lido && (
                          <>
                            <CheckCheck size={11} className="text-blue-400" />
                            <span className="text-[9px] text-blue-400">Visualizado</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {/* Typing indicator */}
            {quemDigitando && (
              <div className="flex items-center gap-1.5 px-1 py-1">
                <span className="text-xs text-slate-500 italic">{quemDigitando} está digitando</span>
                <span className="flex gap-0.5 items-end">
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-3 flex-shrink-0">
            {/* Reply preview bar */}
            {respostaParaMsg && (
              <div className="flex items-center justify-between bg-blue-50 border-l-2 border-blue-500 px-2 py-1.5 rounded-lg mb-2 gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <CornerUpLeft size={12} className="text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-blue-600">{respostaParaMsg.remetente_nome}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {respostaParaMsg.conteudo || respostaParaMsg.arquivo_nome || '📎 arquivo'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setRespostaParaMsg(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                  <X size={12} />
                </button>
              </div>
            )}

            {gravando ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelarGravacao}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
                  title="Cancelar"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  <span className="text-sm text-red-600 font-medium">
                    {Math.floor(duracaoGravacao / 60).toString().padStart(2, '0')}:{(duracaoGravacao % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={pararGravacao}
                  className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0"
                  title="Enviar áudio"
                >
                  <Square size={16} fill="white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={enviandoArquivo}
                  className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-40 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
                  title="Anexar arquivo"
                >
                  <Paperclip size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { enviarArquivo(f); e.target.value = ''; }
                  }}
                />
                <input
                  type="text"
                  value={texto}
                  onChange={e => handleTextoChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(); } }}
                  placeholder={dmAtivo ? `Mensagem para ${dmAtivo.nome}...` : 'Mensagem no canal geral...'}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {texto.trim() ? (
                  <button
                    onClick={enviarMensagem}
                    disabled={enviandoArquivo}
                    className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {enviandoArquivo
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send size={16} />
                    }
                  </button>
                ) : (
                  <button
                    onClick={iniciarGravacao}
                    disabled={enviandoArquivo}
                    className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40 transition-colors"
                    title="Gravar áudio"
                  >
                    <Mic size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
