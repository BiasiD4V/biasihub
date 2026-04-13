import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';
import { ChatHeader } from './chat/ChatHeader';
import { ChatContactsList, type Canal } from './chat/ChatContactsList';
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
import { X, Check } from 'lucide-react';

interface ChatMembrosProps {
  aberto: boolean;
  onFechar: () => void;
}

const CALL_WINDOW_NAME = 'biasi-hub-call';
const HEARTBEAT_OFFLINE_MS = 3 * 60 * 1000; // 3 minutes

export function ChatMembros({ aberto, onFechar }: ChatMembrosProps) {
  const { usuario } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [canais, setCanais] = useState<Canal[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [canalAtivo, setCanalAtivo] = useState<string>('geral');
  const [canalSelecionado, setCanalSelecionado] = useState<Canal | null>(null);
  const [dmAtivo, setDmAtivo] = useState<Membro | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(true);
  const [naoLidasPorConta, setNaoLidasPorConta] = useState<Record<string, number>>({});
  const [naoLidasPorCanal, setNaoLidasPorCanal] = useState<Record<string, number>>({});
  const [geralNaoLidaCount, setGeralNaoLidaCount] = useState(0);
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
  // Modal criar grupo
  const [criarGrupoAberto, setCriarGrupoAberto] = useState(false);
  const [novoGrupoNome, setNovoGrupoNome] = useState('');
  const [novoGrupoMembros, setNovoGrupoMembros] = useState<Set<string>>(new Set());
  const [criandoGrupo, setCriandoGrupo] = useState(false);

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
          const textoFim = duracao ? `Chamada encerrada - ${duracao}` : 'Chamada encerrada';
          supabase.from('chat_mensagens').update({ arquivo_tipo: 'link/call-ended', arquivo_nome: textoFim, arquivo_url: null }).eq('id', msgId).then();
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

  // Typing indicator
  useEffect(() => {
    if (!aberto || !usuario) return;
    const tc = supabase.channel('chat-digitando-broadcast-hub');
    typingChannelRef.current = tc;
    tc.on('broadcast', { event: 'digitando' }, ({ payload }) => {
      if (payload.user_id === usuario.id) return;
      const meuCanal = canalAtivoRef.current;
      if (payload.canal === meuCanal || (payload.canal === 'geral' && meuCanal === 'geral')) {
        setQuemDigitando(payload.user_nome as string);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setQuemDigitando(null), 3000);
      }
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

  // Fetch members + canais
  useEffect(() => {
    if (!aberto || !usuario) return;

    async function fetchMembros() {
      try {
        const { data: usuariosData } = await supabase
          .from('usuarios')
          .select('id, nome, email')
          .eq('ativo', true)
          .neq('id', usuario!.id);

        const { data: presencaData } = await supabase
          .from('presenca_usuarios')
          .select('user_id, esta_online, ultimo_heartbeat, ultima_entrada');

        const presencaMap = new Map(
          (presencaData || []).map(p => [p.user_id, p])
        );

        const now = Date.now();
        setMembros(
          (usuariosData || []).map(u => {
            const p = presencaMap.get(u.id);
            const heartbeat = p?.ultimo_heartbeat ? new Date(p.ultimo_heartbeat).getTime() : 0;
            // Fix: consider offline if heartbeat is older than 3 minutes
            const realmenteOnline = p?.esta_online === true && (now - heartbeat) < HEARTBEAT_OFFLINE_MS;
            return {
              id: u.id,
              nome: u.nome,
              email: u.email,
              esta_online: realmenteOnline,
              ultimo_visto: p?.ultimo_heartbeat ?? null,
              conectado_desde: realmenteOnline ? p?.ultima_entrada ?? null : null,
            };
          })
        );
      } catch { /* silently fail */ }
    }

    async function fetchCanais() {
      try {
        const { data } = await supabase
          .from('chat_membros')
          .select('canal_id, chat_canais(id, nome, tipo, descricao, icone)')
          .eq('usuario_id', usuario!.id);

        if (data) {
          const list: Canal[] = data
            .map((row: any) => row.chat_canais)
            .filter(Boolean)
            .map((c: any) => ({ id: c.id, nome: c.nome, tipo: c.tipo, descricao: c.descricao, icone: c.icone }));
          setCanais(list);
        }
      } catch { /* silently fail */ }
    }

    fetchMembros();
    fetchCanais();

    const presencaChannel = supabase
      .channel('chat-presenca-realtime-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presenca_usuarios' }, (payload) => {
        const row = (payload.new || {}) as { user_id?: string; esta_online?: boolean; ultimo_heartbeat?: string; ultima_entrada?: string | null };
        if (!row.user_id) return;
        const heartbeat = row.ultimo_heartbeat ? new Date(row.ultimo_heartbeat).getTime() : 0;
        const realmenteOnline = row.esta_online === true && (Date.now() - heartbeat) < HEARTBEAT_OFFLINE_MS;
        setMembros(prev => prev.map(m =>
          m.id === row.user_id
            ? { ...m, esta_online: realmenteOnline, ultimo_visto: row.ultimo_heartbeat ?? m.ultimo_visto, conectado_desde: realmenteOnline ? row.ultima_entrada ?? m.conectado_desde : null }
            : m
        ));
      })
      .subscribe();

    const tick = setInterval(() => setMembros(prev => [...prev]), 30000);
    return () => { supabase.removeChannel(presencaChannel); clearInterval(tick); };
  }, [aberto, usuario]);

  // Load messages
  const carregarMensagens = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);

    let query = supabase.from('chat_mensagens').select('*').order('criado_em', { ascending: true }).limit(200);

    if (canalSelecionado) {
      // Channel-based: use canal_id
      query = query.eq('canal_id', canalSelecionado.id);
    } else if (dmAtivo) {
      // DM
      query = query.is('canal_id', null).eq('canal', 'dm').or(
        `and(remetente_id.eq.${usuario.id},destinatario_id.eq.${dmAtivo.id}),and(remetente_id.eq.${dmAtivo.id},destinatario_id.eq.${usuario.id})`
      );
    } else {
      // Geral (old style, canal_id IS NULL)
      query = query.is('canal_id', null).eq('canal', 'geral');
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
  }, [usuario, canalAtivo, dmAtivo, canalSelecionado]);

  useEffect(() => {
    if (!aberto || !usuario) return;
    carregarMensagens();
  }, [aberto, carregarMensagens, usuario]);

  // Realtime messages
  useEffect(() => {
    if (!usuario) return;
    const channel = supabase
      .channel('chat-realtime-hub-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' }, (payload) => {
        const nova = payload.new as Mensagem & { tipo?: string; canal_id?: string };

        if (nova.tipo === 'reacao' && nova.resposta_id) {
          if (!(aberto && !mostrarLista)) return;
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

        const ehMinhaMensagem = nova.remetente_id === usuario.id;
        const chatEmFoco = aberto && !mostrarLista;
        const ehCanalAberto =
          chatEmFoco &&
          !!canalSelecionado &&
          !!nova.canal_id &&
          nova.canal_id === canalSelecionado.id;
        const ehGeralAberto =
          chatEmFoco &&
          !canalSelecionado &&
          !dmAtivo &&
          canalAtivo === 'geral' &&
          nova.canal === 'geral' &&
          !nova.canal_id;
        const ehDmAberto =
          chatEmFoco &&
          !!dmAtivo &&
          nova.canal === 'dm' &&
          !nova.canal_id &&
          (
            (nova.remetente_id === usuario.id && nova.destinatario_id === dmAtivo.id) ||
            (nova.remetente_id === dmAtivo.id && nova.destinatario_id === usuario.id)
          );

        if (ehCanalAberto) {
          setMensagens(prev => [...prev, nova]);
        } else if (ehGeralAberto) {
          setMensagens(prev => [...prev, nova]);
        } else if (ehDmAberto) {
          if (nova.destinatario_id === usuario.id) {
            setMensagens(prev => [...prev, { ...nova, lido: true }]);
            supabase.from('chat_mensagens').update({ lido: true }).eq('id', nova.id).then();
          } else {
            setMensagens(prev => [...prev, nova]);
          }
        }

        if (!ehMinhaMensagem) {
          if (nova.canal === 'dm' && nova.destinatario_id === usuario.id) {
            if (!ehDmAberto) {
              setNaoLidasPorConta((prev) => ({
                ...prev,
                [nova.remetente_id]: Math.min((prev[nova.remetente_id] || 0) + 1, 99),
              }));
            }
          } else if (nova.canal === 'geral' && !nova.canal_id) {
            if (!ehGeralAberto) {
              setGeralNaoLidaCount((prev) => Math.min(prev + 1, 99));
            }
          } else if (nova.canal_id) {
            if (!ehCanalAberto) {
              setNaoLidasPorCanal((prev) => ({
                ...prev,
                [nova.canal_id!]: Math.min((prev[nova.canal_id!] || 0) + 1, 99),
              }));
            }
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_mensagens' }, (payload) => {
        const updated = payload.new as Mensagem & { tipo?: string };
        if (aberto && !mostrarLista) {
          setMensagens(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_mensagens' }, (payload) => {
        const deleted = payload.old as { id: string; resposta_id?: string; tipo?: string; remetente_id?: string };
        if (deleted.tipo === 'reacao' && deleted.resposta_id) {
          setReacoesPorMsg(prev => {
            const next = { ...prev };
            if (next[deleted.resposta_id!]) {
              next[deleted.resposta_id!] = next[deleted.resposta_id!]
                .map(r => ({ ...r, usuarios: r.usuarios.filter((_, i) => r.userIds[i] !== deleted.remetente_id), userIds: r.userIds.filter(id => id !== deleted.remetente_id) }))
                .filter(r => r.userIds.length > 0);
            }
            return next;
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [usuario?.id, aberto, mostrarLista, canalAtivo, dmAtivo?.id, canalSelecionado?.id]);

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
      typingChannelRef.current?.send({
        type: 'broadcast', event: 'digitando',
        payload: { user_id: usuario?.id, user_nome: usuario?.nome, canal: canalAtivo },
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
    } catch { /* permissao negada */ }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setGravando(false);
    if (gravacaoTimerRef.current) { clearInterval(gravacaoTimerRef.current); gravacaoTimerRef.current = null; }
    setDuracaoGravacao(0);
  }

  function cancelarGravacao() {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); mediaRecorderRef.current = null; }
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
        arquivo_url: urlData.publicUrl, arquivo_nome: file.name, arquivo_tipo: file.type,
      };
      if (canalSelecionado) {
        msg.canal = 'canal';
        msg.canal_id = canalSelecionado.id;
      } else if (dmAtivo) {
        msg.canal = 'dm';
        msg.destinatario_id = dmAtivo.id;
      } else {
        msg.canal = 'geral';
      }
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
      conteudo: texto.trim(),
    };
    if (canalSelecionado) {
      msg.canal = 'canal';
      msg.canal_id = canalSelecionado.id;
    } else if (dmAtivo) {
      msg.canal = 'dm';
      msg.destinatario_id = dmAtivo.id;
    } else {
      msg.canal = 'geral';
    }
    if (respostaParaMsg) {
      msg.resposta_id = respostaParaMsg.id;
      msg.resposta_remetente_nome = respostaParaMsg.remetente_nome;
      msg.resposta_conteudo = respostaParaMsg.conteudo || respostaParaMsg.arquivo_nome || '\u{1F4CE} arquivo';
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
              .map(r => r.emoji === emoji ? { ...r, usuarios: r.usuarios.filter((_, i) => r.userIds[i] !== usuario.id), userIds: r.userIds.filter(id => id !== usuario.id) } : r)
              .filter(r => r.userIds.length > 0);
          }
          return next;
        });
      }
    } else {
      const msg = mensagens.find(m => m.id === msgId);
      if (!msg) return;
      const ins: Record<string, unknown> = {
        remetente_id: usuario.id, remetente_nome: usuario.nome, conteudo: emoji,
        canal: msg.canal, tipo: 'reacao', resposta_id: msgId,
      };
      if ((msg as any).canal_id) ins.canal_id = (msg as any).canal_id;
      if (msg.destinatario_id) ins.destinatario_id = msg.destinatario_id;
      await supabase.from('chat_mensagens').insert(ins);
    }
  }

  async function deletarMensagem(msgId: string) {
    if (!usuario) return;
    await supabase.from('chat_mensagens').update({ conteudo: '', tipo: 'deletado', arquivo_url: null, arquivo_nome: null, arquivo_tipo: null }).eq('id', msgId).eq('remetente_id', usuario.id);
    setMensagens(prev => prev.map(m => m.id === msgId ? { ...m, conteudo: '', tipo: 'deletado', arquivo_url: null, arquivo_nome: null, arquivo_tipo: null } : m));
  }

  function abrirCanal(canal: Canal) {
    setCanalSelecionado(canal);
    setDmAtivo(null);
    setCanalAtivo(canal.tipo === 'geral' ? 'geral' : `canal-${canal.id}`);
    setMostrarLista(false);
    setRespostaParaMsg(null);
    if (canal.tipo === 'geral') {
      setGeralNaoLidaCount(0);
    } else {
      setNaoLidasPorCanal((prev) => {
        const next = { ...prev };
        delete next[canal.id];
        return next;
      });
    }
  }

  function abrirDM(membro: Membro) {
    setCanalSelecionado(null);
    setDmAtivo(membro);
    setCanalAtivo(`dm-${membro.id}`);
    setMostrarLista(false);
    setRespostaParaMsg(null);
    setNaoLidasPorConta((prev) => {
      const next = { ...prev };
      delete next[membro.id];
      return next;
    });
  }

  function iniciarLigacao() {
    const room = `biasi-${canalAtivo}-${Date.now()}`;
    const encodedName = encodeURIComponent(usuario?.nome ?? 'Anfitriao');
    const participantUrl = `https://meet.jit.si/${room}#config.startWithVideoMuted=true&config.prejoinPageEnabled=false`;
    const hostUrl = `https://meet.jit.si/${room}#config.startWithVideoMuted=true&userInfo.displayName=%22${encodedName}%22&config.prejoinPageEnabled=false`;
    if (usuario) {
      const ins: Record<string, unknown> = {
        remetente_id: usuario.id, remetente_nome: usuario.nome,
        conteudo: `\u{1F4DE} ${usuario.nome} iniciou uma chamada de voz`,
        arquivo_url: participantUrl, arquivo_nome: 'Entrar na chamada', arquivo_tipo: 'link/call',
      };
      if (canalSelecionado) { ins.canal = 'canal'; ins.canal_id = canalSelecionado.id; }
      else if (dmAtivo) { ins.canal = 'dm'; ins.destinatario_id = dmAtivo.id; }
      else { ins.canal = 'geral'; }
      supabase.from('chat_mensagens').insert(ins).select('id').single().then(({ data }) => { if (data?.id) monitorarChamada(data.id); });
    }
    callWindowRef.current = window.open(hostUrl, CALL_WINDOW_NAME);
    callWindowRef.current?.focus();
  }

  function iniciarVideoCall() {
    const room = `biasi-video-${canalAtivo}-${Date.now()}`;
    const encodedName = encodeURIComponent(usuario?.nome ?? 'Anfitriao');
    const participantUrl = `https://meet.jit.si/${room}#config.prejoinPageEnabled=false`;
    const hostUrl = `https://meet.jit.si/${room}#userInfo.displayName=%22${encodedName}%22&config.prejoinPageEnabled=false`;
    if (usuario) {
      const ins: Record<string, unknown> = {
        remetente_id: usuario.id, remetente_nome: usuario.nome,
        conteudo: `\u{1F4F9} ${usuario.nome} iniciou uma videochamada`,
        arquivo_url: participantUrl, arquivo_nome: 'Entrar na chamada', arquivo_tipo: 'link/call',
      };
      if (canalSelecionado) { ins.canal = 'canal'; ins.canal_id = canalSelecionado.id; }
      else if (dmAtivo) { ins.canal = 'dm'; ins.destinatario_id = dmAtivo.id; }
      else { ins.canal = 'geral'; }
      supabase.from('chat_mensagens').insert(ins).select('id').single().then(({ data }) => { if (data?.id) monitorarChamada(data.id); });
    }
    callWindowRef.current = window.open(hostUrl, CALL_WINDOW_NAME);
    callWindowRef.current?.focus();
  }

  function voltarParaLista() {
    setMostrarLista(true); setDmAtivo(null); setCanalSelecionado(null); setCanalAtivo('geral');
    setRespostaParaMsg(null); setBuscaMsgAberta(false); setBuscaMensagem(''); setReacaoPickerAberto(null);
  }

  // Criar grupo
  async function handleCriarGrupo() {
    if (!novoGrupoNome.trim() || !usuario) return;
    setCriandoGrupo(true);

    const nomeGrupo = novoGrupoNome.trim();
    let canalCriadoId: string | null = null;

    try {
      const { data: canal, error } = await supabase
        .from('chat_canais')
        .insert({
          nome: nomeGrupo,
          tipo: 'grupo',
          descricao: null,
          icone: '\u{1F4AC}',
          criado_por: usuario.id,
        })
        .select('id, nome, tipo, descricao, icone')
        .single();

      if (error || !canal) throw error ?? new Error('Falha ao criar canal');
      canalCriadoId = canal.id;

      const participantes = Array.from(new Set([usuario.id, ...Array.from(novoGrupoMembros)])).filter(Boolean);
      const membrosComPapel = participantes.map((uid) => ({
        canal_id: canal.id,
        usuario_id: uid,
        papel: uid === usuario.id ? 'admin' : 'membro',
      }));

      const { error: membroError } = await supabase.from('chat_membros').insert(membrosComPapel);
      if (membroError) {
        // Fallback para esquemas legados onde "papel" não existe/aceita valores diferentes.
        const membrosSemPapel = participantes.map((uid) => ({
          canal_id: canal.id,
          usuario_id: uid,
        }));
        const { error: membroFallbackError } = await supabase.from('chat_membros').insert(membrosSemPapel);
        if (membroFallbackError) throw membroFallbackError;
      }

      // Refresh canais
      const { data: novosCanais } = await supabase
        .from('chat_membros')
        .select('canal_id, chat_canais(id, nome, tipo, descricao, icone)')
        .eq('usuario_id', usuario.id);
      if (novosCanais) {
        setCanais(novosCanais.map((row: any) => row.chat_canais).filter(Boolean));
      }

      setCanalSelecionado({
        id: canal.id,
        nome: canal.nome ?? nomeGrupo,
        tipo: 'grupo',
        descricao: canal.descricao ?? undefined,
        icone: canal.icone ?? '\u{1F4AC}',
      });
      setCanalAtivo(canal.id);
      setMostrarLista(false);
      setCriarGrupoAberto(false);
      setNovoGrupoNome('');
      setNovoGrupoMembros(new Set());
    } catch (error) {
      console.error('Erro ao criar grupo de chat:', error);
      if (canalCriadoId) {
        await supabase.from('chat_canais').delete().eq('id', canalCriadoId);
      }
      window.alert('Não foi possível criar o grupo agora. Tente novamente.');
    } finally {
      setCriandoGrupo(false);
    }
  }

  if (!aberto) return null;

  const outrosMembros = membros.filter(m => m.id !== usuario?.id);
  const ultimaMinhaMensagemId = [...mensagens].reverse().find(m => m.remetente_id === usuario?.id)?.id;
  const onlineCount = outrosMembros.filter(m => m.esta_online).length;
  const mensagensFiltradas = buscaMensagem.trim()
    ? mensagens.filter(m => m.conteudo?.toLowerCase().includes(buscaMensagem.toLowerCase()) || m.remetente_nome?.toLowerCase().includes(buscaMensagem.toLowerCase()))
    : mensagens;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-[100] w-full max-w-[420px] h-[100dvh] sm:h-[calc(100dvh-2rem)] sm:max-h-[760px] bg-slate-900 border-2 border-slate-700 rounded-t-[32px] sm:rounded-[32px] shadow-[0_32px_80px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">
      <ChatHeader
        mostrarLista={mostrarLista}
        dmAtivo={canalSelecionado && !dmAtivo ? null : dmAtivo}
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

      {/* Channel name bar when in a channel */}
      {!mostrarLista && canalSelecionado && !dmAtivo && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-700 flex items-center gap-2">
          <span className="text-base">{canalSelecionado.icone || '#'}</span>
          <span className="text-sm font-semibold text-slate-100">{canalSelecionado.nome}</span>
          {canalSelecionado.descricao && <span className="text-[10px] text-slate-300 truncate"> - {canalSelecionado.descricao}</span>}
        </div>
      )}

      {mostrarLista ? (
        <ChatContactsList
          membros={outrosMembros}
          canais={canais}
          buscaMembro={buscaMembro}
          geralNaoLidaCount={geralNaoLidaCount}
          naoLidasPorConta={naoLidasPorConta}
          naoLidasPorCanal={naoLidasPorCanal}
          onBuscaMembro={setBuscaMembro}
          onAbrirCanal={abrirCanal}
          onAbrirDM={abrirDM}
          onCriarGrupo={() => setCriarGrupoAberto(true)}
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

      {/* Modal Criar Grupo */}
      {criarGrupoAberto && (
        <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
            <span className="font-semibold text-sm">Novo Grupo</span>
            <button onClick={() => { setCriarGrupoAberto(false); setNovoGrupoNome(''); setNovoGrupoMembros(new Set()); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <input
              type="text"
              value={novoGrupoNome}
              onChange={e => setNovoGrupoNome(e.target.value)}
              placeholder="Nome do grupo..."
              className="w-full px-3.5 py-2.5 text-sm text-slate-100 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 mb-4 placeholder:text-slate-400"
              autoFocus
            />
            <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest mb-2">Selecionar membros ({novoGrupoMembros.size})</p>
            <div className="space-y-0.5">
              {membros.map(m => {
                const selecionado = novoGrupoMembros.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setNovoGrupoMembros(prev => {
                      const next = new Set(prev);
                      if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                      return next;
                    })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${selecionado ? 'bg-blue-500/20 border border-blue-400/40' : 'hover:bg-slate-800'}`}
                  >
                    <div className={`bg-gradient-to-br ${getAvatarColor(m.nome)} rounded-full w-8 h-8 flex items-center justify-center shadow-sm`}>
                      <span className="text-white text-[10px] font-bold">{m.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-100 flex-1">{m.nome}</span>
                    {selecionado && <Check size={16} className="text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleCriarGrupo}
              disabled={!novoGrupoNome.trim() || criandoGrupo}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {criandoGrupo ? 'Criando...' : `Criar Grupo (${novoGrupoMembros.size + 1} participantes)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


