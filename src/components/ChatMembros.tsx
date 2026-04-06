import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';
import { ChatHeader } from './chat/ChatHeader';
import { ChatContactsList } from './chat/ChatContactsList';
import { ChatMessagesList } from './chat/ChatMessagesList';
import { ChatInput } from './chat/ChatInput';
import type { Membro, Mensagem, ReacaoAgregada } from './chat/chatTypes';
import {
  getAvatarColor,
  formatDateSeparator,
  shouldShowDateSeparator,
  isConsecutive,
  formatTempoOnline,
  formatUltimoVisto,
} from './chat/chatTypes';

interface ChatMembrosProps {
  aberto: boolean;
  onFechar: () => void;
}

export type { Membro, Mensagem, ReacaoAgregada };

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
  const [geralNaoLida, setGeralNaoLida] = useState(false);
  const [respostaParaMsg, setRespostaParaMsg] = useState<Mensagem | null>(null);
  const [quemDigitando, setQuemDigitando] = useState<string | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [duracaoGravacao, setDuracaoGravacao] = useState(0);
  const [buscaMembro, setBuscaMembro] = useState('');
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [buscaMensagem, setBuscaMensagem] = useState('');
  const [buscaMsgAberta, setBuscaMsgAberta] = useState(false);
  const [reacoesPorMsg, setReacoesPorMsg] = useState<Record<string, ReacaoAgregada[]>>({});
  const [reacaoPickerAberto, setReacaoPickerAberto] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const canalAtivoRef = useRef(canalAtivo);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const gravacaoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callWindowRef = useRef<Window | null>(null);
  const callPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { canalAtivoRef.current = canalAtivo; }, [canalAtivo]);

  function monitorarChamada(msgId: string) {
    if (callPollRef.current) clearInterval(callPollRef.current);
    callPollRef.current = setInterval(() => {
      if (callWindowRef.current && callWindowRef.current.closed) {
        clearInterval(callPollRef.current!);
        callPollRef.current = null;
        callWindowRef.current = null;
        supabase.from('chat_mensagens').select('criado_em').eq('id', msgId).single().then(({ data }) => {
          const duracao = data?.criado_em ? calcDuracao(data.criado_em) : '';
          const textoFim = duracao ? `Chamada encerrada · ${duracao}` : 'Chamada encerrada';
          supabase.from('chat_mensagens').update({
            arquivo_tipo: 'link/call-ended',
            arquivo_nome: textoFim,
            arquivo_url: null,
          }).eq('id', msgId).then();
        });
      }
    }, 2000);
  }

  function calcDuracao(inicio: string): string {
    const diff = Date.now() - new Date(inicio).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}min`;
    return `${Math.floor(m / 60)}h ${m % 60}min`;
  }

  useEffect(() => {
    if (!aberto || !usuario) return;
    const tc = supabase.channel('chat-digitando-broadcast');
    typingChannelRef.current = tc;
    tc.on('broadcast', { event: 'digitando' }, ({ payload }) => {
      if (payload.user_id === usuario.id) return;
      const meuCanal = canalAtivoRef.current;
      if (payload.canal === 'geral' && meuCanal === 'geral') {
        // OK
      } else if (payload.canal.startsWith('dm:') && meuCanal === `dm-${payload.user_id}`) {
        const targetId = payload.canal.replace('dm:', '');
        if (targetId !== usuario.id) return;
      } else {
        return;
      }
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

  useEffect(() => {
    if (!aberto) {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      if (gravacaoTimerRef.current) clearInterval(gravacaoTimerRef.current);
      setGravando(false);
      setDuracaoGravacao(0);
    }
  }, [aberto]);

  useEffect(() => { setQuemDigitando(null); setEmojiAberto(false); }, [canalAtivo]);

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
          ultimo_visto: string | null; conectado_desde: string | null;
        }>;
        setMembros(
          data.filter(m => m.ativo && m.id !== usuario?.id)
            .map(m => ({ id: m.id, nome: m.nome, email: m.email, esta_online: m.esta_online, ultimo_visto: m.ultimo_visto, conectado_desde: m.conectado_desde }))
        );
      } catch { /* silently fail */ }
    }
    fetchMembros();

    const presencaChannel = supabase
      .channel('chat-presenca-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presenca_usuarios' }, (payload) => {
        const row = (payload.new || {}) as { user_id?: string; esta_online?: boolean; ultimo_heartbeat?: string; ultima_entrada?: string | null };
        if (!row.user_id) return;
        setMembros(prev => prev.map(m =>
          m.id === row.user_id
            ? { ...m, esta_online: row.esta_online ?? m.esta_online, ultimo_visto: row.ultimo_heartbeat ?? m.ultimo_visto, conectado_desde: row.ultima_entrada ?? m.conectado_desde }
            : m
        ));
      })
      .subscribe();

    const tick = setInterval(() => setMembros(prev => [...prev]), 30000);
    return () => { supabase.removeChannel(presencaChannel); clearInterval(tick); };
  }, [aberto, usuario]);

  const carregarMensagens = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);
    let query = supabase.from('chat_mensagens').select('*').order('criado_em', { ascending: true }).limit(200);
    if (canalAtivo === 'geral') {
      query = query.eq('canal', 'geral');
    } else if (dmAtivo) {
      query = query.eq('canal', 'dm').or(
        `and(remetente_id.eq.${usuario.id},destinatario_id.eq.${dmAtivo.id}),and(remetente_id.eq.${dmAtivo.id},destinatario_id.eq.${usuario.id})`
      );
    }
    const { data, error } = await query;
    if (!error && data) {
      const reacoes: Record<string, ReacaoAgregada[]> = {};
      const msgs: Mensagem[] = [];
      for (const row of data as (Mensagem & { tipo?: string })[]) {
        if (row.tipo === 'reacao' && row.resposta_id) {
          if (!reacoes[row.resposta_id]) reacoes[row.resposta_id] = [];
          const grupo = reacoes[row.resposta_id];
          const existing = grupo.find(r => r.emoji === row.conteudo);
          if (existing) {
            existing.usuarios.push(row.remetente_nome);
            existing.userIds.push(row.remetente_id);
          } else {
            grupo.push({ emoji: row.conteudo, usuarios: [row.remetente_nome], userIds: [row.remetente_id] });
          }
        } else {
          msgs.push(row);
        }
      }
      setMensagens(msgs);
      setReacoesPorMsg(reacoes);
    }
    setCarregando(false);
  }, [usuario, canalAtivo, dmAtivo]);

  useEffect(() => {
    if (!aberto || !usuario) return;
    carregarMensagens();
  }, [aberto, carregarMensagens, usuario]);

  useEffect(() => {
    if (!aberto || !usuario) return;
    const channel = supabase
      .channel('chat-realtime-v2')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' }, (payload) => {
        const nova = payload.new as Mensagem & { tipo?: string };
        if (nova.tipo === 'reacao' && nova.resposta_id) {
          setReacoesPorMsg(prev => {
            const next = { ...prev };
            if (!next[nova.resposta_id!]) next[nova.resposta_id!] = [];
            const grupo = [...next[nova.resposta_id!]];
            const existing = grupo.find(r => r.emoji === nova.conteudo);
            if (existing) {
              if (!existing.userIds.includes(nova.remetente_id)) {
                existing.usuarios = [...existing.usuarios, nova.remetente_nome];
                existing.userIds = [...existing.userIds, nova.remetente_id];
              }
            } else {
              grupo.push({ emoji: nova.conteudo, usuarios: [nova.remetente_nome], userIds: [nova.remetente_id] });
            }
            next[nova.resposta_id!] = grupo;
            return next;
          });
          return;
        }
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
        if (nova.canal === 'geral' && nova.remetente_id !== usuario.id && canalAtivo !== 'geral') {
          setGeralNaoLida(true);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_mensagens' }, (payload) => {
        const updated = payload.new as Mensagem & { tipo?: string };
        setMensagens(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_mensagens' }, (payload) => {
        const deleted = payload.old as { id: string; resposta_id?: string; tipo?: string; remetente_id?: string };
        if (deleted.tipo === 'reacao' && deleted.resposta_id) {
          setReacoesPorMsg(prev => {
            const next = { ...prev };
            if (next[deleted.resposta_id!]) {
              next[deleted.resposta_id!] = next[deleted.resposta_id!]
                .map(r => ({
                  ...r,
                  usuarios: r.usuarios.filter((_, i) => r.userIds[i] !== deleted.remetente_id),
                  userIds: r.userIds.filter(id => id !== deleted.remetente_id),
                }))
                .filter(r => r.userIds.length > 0);
            }
            return next;
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [aberto, usuario, canalAtivo, dmAtivo]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensagens, quemDigitando]);

  const dmAtivoId = dmAtivo?.id;
  const usuarioId = usuario?.id;
  useEffect(() => {
    if (!dmAtivoId || !usuarioId) return;
    supabase.from('chat_mensagens').update({ lido: true })
      .eq('canal', 'dm').eq('remetente_id', dmAtivoId).eq('destinatario_id', usuarioId).eq('lido', false).then();
  }, [dmAtivoId, usuarioId]);

  function handleTextoChange(val: string) {
    setTexto(val);
    setEmojiAberto(false);
    try {
      const canalBroadcast = dmAtivo ? `dm:${dmAtivo.id}` : 'geral';
      typingChannelRef.current?.send({
        type: 'broadcast', event: 'digitando',
        payload: { user_id: usuario?.id, user_nome: usuario?.nome, canal: canalBroadcast },
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
        remetente_id: usuario.id, remetente_nome: usuario.nome, conteudo: '',
        canal: canalAtivo === 'geral' ? 'geral' : 'dm',
        arquivo_url: urlData.publicUrl, arquivo_nome: file.name, arquivo_tipo: file.type,
      };
      if (dmAtivo && canalAtivo !== 'geral') msg.destinatario_id = dmAtivo.id;
      await supabase.from('chat_mensagens').insert(msg);
    } catch { /* ignore */ }
    setEnviandoArquivo(false);
  }

  function inserirEmoji(emoji: string) { setTexto(prev => prev + emoji); }

  async function enviarMensagem() {
    if (!texto.trim() || !usuario) return;
    setEmojiAberto(false);
    const msg: Record<string, unknown> = {
      remetente_id: usuario.id, remetente_nome: usuario.nome,
      conteudo: texto.trim(), canal: canalAtivo === 'geral' ? 'geral' : 'dm',
    };
    if (dmAtivo && canalAtivo !== 'geral') msg.destinatario_id = dmAtivo.id;
    if (respostaParaMsg) {
      msg.resposta_id = respostaParaMsg.id;
      msg.resposta_remetente_nome = respostaParaMsg.remetente_nome;
      msg.resposta_conteudo = respostaParaMsg.conteudo || respostaParaMsg.arquivo_nome || '📎 arquivo';
    }
    const { error } = await supabase.from('chat_mensagens').insert(msg);
    if (!error) { setTexto(''); setRespostaParaMsg(null); }
  }

  async function toggleReacao(msgId: string, emoji: string) {
    if (!usuario) return;
    setReacaoPickerAberto(null);
    const reacoes = reacoesPorMsg[msgId] || [];
    const existing = reacoes.find(r => r.emoji === emoji);
    const jaReagi = existing?.userIds.includes(usuario.id);
    if (jaReagi) {
      const { data } = await supabase.from('chat_mensagens').select('id')
        .eq('tipo', 'reacao').eq('resposta_id', msgId).eq('remetente_id', usuario.id).eq('conteudo', emoji).limit(1);
      if (data?.[0]) {
        await supabase.from('chat_mensagens').delete().eq('id', data[0].id);
        setReacoesPorMsg(prev => {
          const next = { ...prev };
          if (next[msgId]) {
            next[msgId] = next[msgId]
              .map(r => r.emoji === emoji ? {
                ...r,
                usuarios: r.usuarios.filter((_, i) => r.userIds[i] !== usuario.id),
                userIds: r.userIds.filter(id => id !== usuario.id),
              } : r)
              .filter(r => r.userIds.length > 0);
          }
          return next;
        });
      }
    } else {
      const msg = mensagens.find(m => m.id === msgId);
      if (!msg) return;
      await supabase.from('chat_mensagens').insert({
        remetente_id: usuario.id, remetente_nome: usuario.nome, conteudo: emoji,
        canal: msg.canal, tipo: 'reacao', resposta_id: msgId,
        ...(msg.destinatario_id ? { destinatario_id: msg.destinatario_id } : {}),
      });
    }
  }

  async function deletarMensagem(msgId: string) {
    if (!usuario) return;
    await supabase.from('chat_mensagens').update({
      conteudo: '', tipo: 'deletado', arquivo_url: null, arquivo_nome: null, arquivo_tipo: null,
    }).eq('id', msgId).eq('remetente_id', usuario.id);
    setMensagens(prev => prev.map(m => m.id === msgId
      ? { ...m, conteudo: '', tipo: 'deletado', arquivo_url: null, arquivo_nome: null, arquivo_tipo: null } : m));
  }

  function abrirCanal(tipo: 'geral') {
    setCanalAtivo(tipo); setDmAtivo(null); setMostrarLista(false); setRespostaParaMsg(null); setGeralNaoLida(false);
  }

  function abrirDM(membro: Membro) {
    setDmAtivo(membro); setCanalAtivo(`dm-${membro.id}`); setMostrarLista(false); setRespostaParaMsg(null);
    setNaoLidasPorConta(prev => { const nova = new Set(prev); nova.delete(membro.id); return nova; });
  }

  function iniciarLigacao() {
    const room = `biasi-${canalAtivo}-${Date.now()}`;
    const encodedName = encodeURIComponent(usuario?.nome ?? 'Anfitrião');
    const participantUrl = `https://meet.jit.si/${room}#config.startWithVideoMuted=true&config.prejoinPageEnabled=false`;
    const hostUrl = `https://meet.jit.si/${room}#config.startWithVideoMuted=true&userInfo.displayName=%22${encodedName}%22&config.prejoinPageEnabled=false`;
    if (usuario) {
      supabase.from('chat_mensagens').insert({
        remetente_id: usuario.id, remetente_nome: usuario.nome,
        conteudo: `📞 ${usuario.nome} iniciou uma chamada de voz`,
        canal: canalAtivo === 'geral' ? 'geral' : 'dm',
        arquivo_url: participantUrl, arquivo_nome: 'Entrar na chamada', arquivo_tipo: 'link/call',
        ...(dmAtivo ? { destinatario_id: dmAtivo.id } : {}),
      }).select('id').single().then(({ data }) => { if (data?.id) monitorarChamada(data.id); });
    }
    callWindowRef.current = window.open(hostUrl, '_blank');
  }

  function iniciarVideoCall() {
    const room = `biasi-video-${canalAtivo}-${Date.now()}`;
    const encodedName = encodeURIComponent(usuario?.nome ?? 'Anfitrião');
    const participantUrl = `https://meet.jit.si/${room}#config.prejoinPageEnabled=false`;
    const hostUrl = `https://meet.jit.si/${room}#userInfo.displayName=%22${encodedName}%22&config.prejoinPageEnabled=false`;
    if (usuario) {
      supabase.from('chat_mensagens').insert({
        remetente_id: usuario.id, remetente_nome: usuario.nome,
        conteudo: `📹 ${usuario.nome} iniciou uma videochamada`,
        canal: canalAtivo === 'geral' ? 'geral' : 'dm',
        arquivo_url: participantUrl, arquivo_nome: 'Entrar na chamada', arquivo_tipo: 'link/call',
        ...(dmAtivo ? { destinatario_id: dmAtivo.id } : {}),
      }).select('id').single().then(({ data }) => { if (data?.id) monitorarChamada(data.id); });
    }
    callWindowRef.current = window.open(hostUrl, '_blank');
  }

  function voltarParaLista() {
    setMostrarLista(true); setDmAtivo(null); setCanalAtivo('geral');
    setRespostaParaMsg(null); setBuscaMsgAberta(false); setBuscaMensagem(''); setReacaoPickerAberto(null);
  }

  if (!aberto) return null;

  const outrosMembros = membros.filter(m => m.id !== usuario?.id);
  const ultimaMinhaMensagemId = [...mensagens].reverse().find(m => m.remetente_id === usuario?.id)?.id;
  const onlineCount = outrosMembros.filter(m => m.esta_online).length;
  const mensagensFiltradas = buscaMensagem.trim()
    ? mensagens.filter(m => m.conteudo?.toLowerCase().includes(buscaMensagem.toLowerCase()) || m.remetente_nome?.toLowerCase().includes(buscaMensagem.toLowerCase()))
    : mensagens;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full max-w-[420px] h-[100dvh] max-h-[620px] bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.18)] border border-slate-200/60 flex flex-col overflow-hidden backdrop-blur-sm">
      <ChatHeader
        mostrarLista={mostrarLista}
        dmAtivo={dmAtivo}
        quemDigitando={quemDigitando}
        onlineCount={onlineCount}
        buscaMsgAberta={buscaMsgAberta}
        onVoltarParaLista={voltarParaLista}
        onFechar={onFechar}
        onToggleBusca={() => { setBuscaMsgAberta(p => !p); setBuscaMensagem(''); }}
        onIniciarLigacao={iniciarLigacao}
        onIniciarVideoCall={iniciarVideoCall}
        getAvatarColor={getAvatarColor}
        formatTempoOnline={formatTempoOnline}
        formatUltimoVisto={formatUltimoVisto}
      />

      {mostrarLista ? (
        <ChatContactsList
          membros={outrosMembros}
          buscaMembro={buscaMembro}
          geralNaoLida={geralNaoLida}
          naoLidasPorConta={naoLidasPorConta}
          onBuscaMembro={setBuscaMembro}
          onAbrirCanal={abrirCanal}
          onAbrirDM={abrirDM}
        />
      ) : (
        <>
          <ChatMessagesList
            mensagens={mensagens}
            mensagensFiltradas={mensagensFiltradas}
            reacoesPorMsg={reacoesPorMsg}
            carregando={carregando}
            quemDigitando={quemDigitando}
            dmAtivo={dmAtivo}
            usuarioId={usuario?.id}
            ultimaMinhaMensagemId={ultimaMinhaMensagemId}
            buscaMsgAberta={buscaMsgAberta}
            buscaMensagem={buscaMensagem}
            reacaoPickerAberto={reacaoPickerAberto}
            scrollRef={scrollRef}
            onSetBuscaMensagem={setBuscaMensagem}
            onSetBuscaMsgAberta={setBuscaMsgAberta}
            onSetRespostaParaMsg={setRespostaParaMsg}
            onSetReacaoPickerAberto={setReacaoPickerAberto}
            onToggleReacao={toggleReacao}
            onDeletarMensagem={deletarMensagem}
            getAvatarColor={getAvatarColor}
            formatDateSeparator={formatDateSeparator}
            shouldShowDateSeparator={shouldShowDateSeparator}
            isConsecutive={isConsecutive}
          />
          <ChatInput
            texto={texto}
            dmAtivo={dmAtivo}
            respostaParaMsg={respostaParaMsg}
            enviandoArquivo={enviandoArquivo}
            gravando={gravando}
            duracaoGravacao={duracaoGravacao}
            emojiAberto={emojiAberto}
            fileInputRef={fileInputRef}
            onHandleTextoChange={handleTextoChange}
            onEnviarMensagem={enviarMensagem}
            onEnviarArquivo={enviarArquivo}
            onSetRespostaParaMsg={setRespostaParaMsg}
            onSetEmojiAberto={setEmojiAberto}
            onInserirEmoji={inserirEmoji}
            onIniciarGravacao={iniciarGravacao}
            onPararGravacao={pararGravacao}
            onCancelarGravacao={cancelarGravacao}
          />
        </>
      )}
    </div>
  );
}
