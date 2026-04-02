import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Send, Hash, ArrowLeft, Paperclip, CornerUpLeft, CheckCheck, Mic, Square, Phone, Video, Search, MessageCircle, Users, Smile, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: '😀 Mais usados', emojis: ['😀','😂','😍','🥰','😎','😭','🤣','😅','🙏','👍','👋','❤️','🔥','🎉','✅','👏','💪','🤝','👀','💯'] },
  { label: '😊 Rostos', emojis: ['😊','😁','😆','🤩','😘','😋','🤔','🤨','😐','😑','🙄','😏','😬','😴','🤮','🤯','🥳','😇','🤗','🫡'] },
  { label: '👋 Gestos', emojis: ['👍','👎','👌','✌️','🤞','🤙','👋','🖐️','🙌','👏','🤝','💪','🙏','☝️','👆','👇','👈','👉','🫶','✊'] },
  { label: '❤️ Corações', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','♥️','🩷','🩵'] },
  { label: '🎉 Objetos', emojis: ['🎉','🎊','🎁','🏆','⭐','🌟','💡','📌','📎','✏️','📝','📊','📈','💰','💼','🔑','🔔','📱','💻','⏰'] },
  { label: '✅ Símbolos', emojis: ['✅','❌','⚠️','🚫','💯','‼️','❓','❗','🔥','💥','✨','🎯','🆗','🆕','🔴','🟢','🟡','⬆️','⬇️','➡️'] },
];

interface Membro {
  id: string;
  nome: string;
  email: string;
  esta_online: boolean;
  ultimo_visto: string | null;
  conectado_desde: string | null;
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
  tipo?: string | null;
}

interface ReacaoAgregada {
  emoji: string;
  usuarios: string[];  // nomes
  userIds: string[];
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏'];

const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"]/g;

interface ChatMembrosProps {
  aberto: boolean;
  onFechar: () => void;
}

const AVATAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-fuchsia-500 to-fuchsia-600',
  'from-orange-500 to-orange-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function shouldShowDateSeparator(msgs: Mensagem[], idx: number): boolean {
  if (idx === 0) return true;
  const curr = new Date(msgs[idx].criado_em).toDateString();
  const prev = new Date(msgs[idx - 1].criado_em).toDateString();
  return curr !== prev;
}

function isConsecutive(msgs: Mensagem[], idx: number): boolean {
  if (idx === 0) return false;
  const prev = msgs[idx - 1];
  const curr = msgs[idx];
  if (prev.remetente_id !== curr.remetente_id) return false;
  const diff = new Date(curr.criado_em).getTime() - new Date(prev.criado_em).getTime();
  return diff < 120000; // 2 min
}

function formatTempoOnline(conectadoDesde: string | null): string {
  if (!conectadoDesde) return 'Online';
  const diff = Date.now() - new Date(conectadoDesde).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Online agora';
  if (min < 60) return `Online há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Online há ${h}h${min % 60 > 0 ? `${min % 60}min` : ''}`;
  return `Online há ${Math.floor(h / 24)}d`;
}

function formatUltimoVisto(ultimoVisto: string | null): string {
  if (!ultimoVisto) return 'Offline';
  const diff = Date.now() - new Date(ultimoVisto).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Visto agora';
  if (min < 60) return `Visto há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Visto há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Visto ontem';
  return `Visto há ${d}d`;
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

  useEffect(() => { canalAtivoRef.current = canalAtivo; }, [canalAtivo]);

  // Typing broadcast channel
  useEffect(() => {
    if (!aberto || !usuario) return;
    const tc = supabase.channel('chat-digitando-broadcast');
    typingChannelRef.current = tc;
    tc.on('broadcast', { event: 'digitando' }, ({ payload }) => {
      if (payload.user_id === usuario.id) return;
      // Para DMs: o remetente envia target_id = destinatário. Mostrar se eu sou o target e estou na DM dele.
      const meuCanal = canalAtivoRef.current;
      if (payload.canal === 'geral' && meuCanal === 'geral') {
        // OK — ambos no geral
      } else if (payload.canal.startsWith('dm:') && meuCanal === `dm-${payload.user_id}`) {
        // DM: o remetente mandou pra mim e eu estou na DM dele
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
          data
            .filter(m => m.ativo && m.id !== usuario?.id)
            .map(m => ({ id: m.id, nome: m.nome, email: m.email, esta_online: m.esta_online, ultimo_visto: m.ultimo_visto, conectado_desde: m.conectado_desde }))
        );
      } catch {
        // silently fail
      }
    }
    fetchMembros();

    // Realtime presence subscription — update member online status live
    const presencaChannel = supabase
      .channel('chat-presenca-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presenca_usuarios' },
        (payload) => {
          const row = (payload.new || {}) as { user_id?: string; esta_online?: boolean; ultimo_heartbeat?: string; ultima_entrada?: string | null };
          if (!row.user_id) return;
          setMembros(prev => prev.map(m =>
            m.id === row.user_id
              ? { ...m, esta_online: row.esta_online ?? m.esta_online, ultimo_visto: row.ultimo_heartbeat ?? m.ultimo_visto, conectado_desde: row.ultima_entrada ?? m.conectado_desde }
              : m
          ));
        }
      )
      .subscribe();

    // Tick to refresh relative times every 30s
    const tick = setInterval(() => setMembros(prev => [...prev]), 30000);

    return () => {
      supabase.removeChannel(presencaChannel);
      clearInterval(tick);
    };
  }, [aberto, usuario]);

  const carregarMensagens = useCallback(async () => {
    if (!usuario) return;
    setCarregando(true);

    let query = supabase
      .from('chat_mensagens')
      .select('*')
      .order('criado_em', { ascending: true })
      .limit(200);

    if (canalAtivo === 'geral') {
      query = query.eq('canal', 'geral');
    } else if (dmAtivo) {
      query = query.eq('canal', 'dm').or(
        `and(remetente_id.eq.${usuario.id},destinatario_id.eq.${dmAtivo.id}),and(remetente_id.eq.${dmAtivo.id},destinatario_id.eq.${usuario.id})`
      );
    }

    const { data, error } = await query;
    if (!error && data) {
      // Separate reactions from messages
      const reacoes: Record<string, ReacaoAgregada[]> = {};
      const msgs: Mensagem[] = [];
      for (const row of data as (Mensagem & { tipo?: string })[]) {
        if (row.tipo === 'reacao' && row.resposta_id) {
          // Aggregate reactions by message
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

  // Realtime subscription
  useEffect(() => {
    if (!aberto || !usuario) return;

    const channel = supabase
      .channel('chat-realtime-v2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_mensagens' },
        (payload) => {
          const nova = payload.new as Mensagem & { tipo?: string };

          // Handle reaction inserts
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
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_mensagens' },
        (payload) => {
          const updated = payload.new as Mensagem & { tipo?: string };
          setMensagens(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_mensagens' },
        (payload) => {
          const deleted = payload.old as { id: string; resposta_id?: string; tipo?: string };
          // If a reaction was deleted, remove it
          if (deleted.tipo === 'reacao' && deleted.resposta_id) {
            setReacoesPorMsg(prev => {
              const next = { ...prev };
              if (next[deleted.resposta_id!]) {
                next[deleted.resposta_id!] = next[deleted.resposta_id!]
                  .map(r => ({
                    ...r,
                    usuarios: r.usuarios.filter((_, i) => r.userIds[i] !== (payload.old as any).remetente_id),
                    userIds: r.userIds.filter(id => id !== (payload.old as any).remetente_id),
                  }))
                  .filter(r => r.userIds.length > 0);
              }
              return next;
            });
          }
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
    setEmojiAberto(false);
    try {
      // Para DMs, enviar canal como 'dm:{targetId}' para que o destinatário saiba que é pra ele
      const canalBroadcast = dmAtivo ? `dm:${dmAtivo.id}` : 'geral';
      typingChannelRef.current?.send({
        type: 'broadcast',
        event: 'digitando',
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

  function inserirEmoji(emoji: string) {
    setTexto(prev => prev + emoji);
  }

  async function enviarMensagem() {
    if (!texto.trim() || !usuario) return;
    setEmojiAberto(false);

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

  async function toggleReacao(msgId: string, emoji: string) {
    if (!usuario) return;
    setReacaoPickerAberto(null);
    const reacoes = reacoesPorMsg[msgId] || [];
    const existing = reacoes.find(r => r.emoji === emoji);
    const jaReagi = existing?.userIds.includes(usuario.id);

    if (jaReagi) {
      // Remove reaction — find and delete the row
      const { data } = await supabase
        .from('chat_mensagens')
        .select('id')
        .eq('tipo', 'reacao')
        .eq('resposta_id', msgId)
        .eq('remetente_id', usuario.id)
        .eq('conteudo', emoji)
        .limit(1);
      if (data?.[0]) {
        await supabase.from('chat_mensagens').delete().eq('id', data[0].id);
        // Update local state
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
      // Add reaction
      const msg = mensagens.find(m => m.id === msgId);
      if (!msg) return;
      await supabase.from('chat_mensagens').insert({
        remetente_id: usuario.id,
        remetente_nome: usuario.nome,
        conteudo: emoji,
        canal: msg.canal,
        tipo: 'reacao',
        resposta_id: msgId,
        ...(msg.destinatario_id ? { destinatario_id: msg.destinatario_id } : {}),
      });
    }
  }

  async function deletarMensagem(msgId: string) {
    if (!usuario) return;
    // Soft delete: update content
    await supabase.from('chat_mensagens').update({
      conteudo: '',
      tipo: 'deletado',
      arquivo_url: null,
      arquivo_nome: null,
      arquivo_tipo: null,
    }).eq('id', msgId).eq('remetente_id', usuario.id);
    // Update local state immediately
    setMensagens(prev => prev.map(m => m.id === msgId ? { ...m, conteudo: '', tipo: 'deletado', arquivo_url: null, arquivo_nome: null, arquivo_tipo: null } : m));
  }

  function renderConteudoComLinks(text: string, isMine: boolean) {
    if (!text) return null;
    const parts = text.split(URL_REGEX);
    const matches = text.match(URL_REGEX);
    if (!matches) return <span>{text}</span>;
    const elements: React.ReactNode[] = [];
    parts.forEach((part, i) => {
      if (part) elements.push(<span key={`t${i}`}>{part}</span>);
      if (matches[i]) {
        elements.push(
          <a
            key={`u${i}`}
            href={matches[i]}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-0.5 underline underline-offset-2 break-all ${isMine ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-700'}`}
          >
            {matches[i].length > 40 ? matches[i].slice(0, 40) + '...' : matches[i]}
            <ExternalLink size={10} className="inline flex-shrink-0" />
          </a>
        );
      }
    });
    return <>{elements}</>;
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
    setBuscaMsgAberta(false);
    setBuscaMensagem('');
    setReacaoPickerAberto(null);
  }

  if (!aberto) return null;

  const outrosMembros = membros.filter(m => m.id !== usuario?.id);
  const membrosFiltrados = buscaMembro
    ? outrosMembros.filter(m => m.nome.toLowerCase().includes(buscaMembro.toLowerCase()))
    : outrosMembros;
  const ultimaMinhaMensagemId = [...mensagens].reverse().find(m => m.remetente_id === usuario?.id)?.id;
  const onlineCount = outrosMembros.filter(m => m.esta_online).length;
  const mensagensFiltradas = buscaMensagem.trim()
    ? mensagens.filter(m => m.conteudo?.toLowerCase().includes(buscaMensagem.toLowerCase()) || m.remetente_nome?.toLowerCase().includes(buscaMensagem.toLowerCase()))
    : mensagens;

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-[100dvh] sm:h-[620px] bg-white sm:rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.18)] border border-slate-200/60 flex flex-col overflow-hidden backdrop-blur-sm">
      {/* ═══════ Header ═══════ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {!mostrarLista && (
            <button onClick={voltarParaLista} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors mr-0.5">
              <ArrowLeft size={16} />
            </button>
          )}
          {mostrarLista ? (
            <div className="flex items-center gap-2.5">
              <div className="bg-white/10 p-1.5 rounded-lg">
                <MessageCircle size={16} />
              </div>
              <div>
                <span className="font-semibold text-sm block leading-tight">Chat da Equipe</span>
                <span className="text-[10px] text-slate-400">{onlineCount} online agora</span>
              </div>
            </div>
          ) : dmAtivo ? (
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className={`bg-gradient-to-br ${getAvatarColor(dmAtivo.nome)} rounded-full w-8 h-8 flex items-center justify-center shadow-sm`}>
                  <span className="text-white text-xs font-bold">{dmAtivo.nome.charAt(0).toUpperCase()}</span>
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${dmAtivo.esta_online ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              </div>
              <div>
                <span className="font-semibold text-sm block leading-tight">{dmAtivo.nome}</span>
                {quemDigitando ? (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    digitando
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">{dmAtivo.esta_online ? formatTempoOnline(dmAtivo.conectado_desde) : formatUltimoVisto(dmAtivo.ultimo_visto)}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="bg-white/10 p-1.5 rounded-lg">
                <Hash size={16} />
              </div>
              <div>
                <span className="font-semibold text-sm block leading-tight">Geral</span>
                {quemDigitando ? (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    {quemDigitando} digitando
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Canal da equipe</span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {!mostrarLista && (
            <>
              <button onClick={() => { setBuscaMsgAberta(p => !p); setBuscaMensagem(''); }} className={`p-2 rounded-lg transition-colors ${buscaMsgAberta ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`} title="Buscar mensagens">
                <Search size={14} />
              </button>
              <button onClick={iniciarLigacao} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Chamada de voz">
                <Phone size={14} />
              </button>
              <button onClick={iniciarVideoCall} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Videochamada">
                <Video size={14} />
              </button>
            </>
          )}
          <button onClick={onFechar} className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {mostrarLista ? (
        <div className="flex-1 overflow-y-auto">
          {/* ═══════ Search ═══════ */}
          <div className="p-3 pb-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={buscaMembro}
                onChange={e => setBuscaMembro(e.target.value)}
                placeholder="Buscar conversa..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* ═══════ Channels ═══════ */}
          <div className="p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
              <Hash size={10} className="text-slate-300" />
              Canais
            </p>
            <button
              onClick={() => abrirCanal('geral')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all text-left group"
            >
              <div className="bg-slate-100 group-hover:bg-blue-100 rounded-lg p-2 transition-colors">
                <Hash size={14} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-700">Geral</span>
                <p className="text-[10px] text-slate-400 truncate">Canal aberto para toda a equipe</p>
              </div>
            </button>
          </div>

          {/* ═══════ Direct Messages ═══════ */}
          <div className="px-3 pb-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
              <Users size={10} className="text-slate-300" />
              Mensagens Diretas
            </p>
            <div className="space-y-0.5">
              {membrosFiltrados.map(m => (
                <button
                  key={m.id}
                  onClick={() => abrirDM(m)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all text-left group"
                >
                  <div className="relative flex-shrink-0">
                    <div className={`bg-gradient-to-br ${getAvatarColor(m.nome)} rounded-full w-9 h-9 flex items-center justify-center shadow-sm`}>
                      <span className="text-white text-xs font-bold">{m.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${m.esta_online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{m.nome}</p>
                      <p className={`text-[10px] ${m.esta_online ? 'text-emerald-500 font-medium' : 'text-slate-400'}`}>
                        {m.esta_online ? formatTempoOnline(m.conectado_desde) : formatUltimoVisto(m.ultimo_visto)}
                      </p>
                    </div>
                    {naoLidasPorConta.has(m.id) && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 ml-2 animate-pulse shadow-sm shadow-blue-500/50" />
                    )}
                  </div>
                </button>
              ))}
              {membrosFiltrados.length === 0 && outrosMembros.length > 0 && (
                <p className="text-xs text-slate-400 px-3 py-4 text-center">Nenhum resultado para &ldquo;{buscaMembro}&rdquo;</p>
              )}
              {outrosMembros.length === 0 && (
                <div className="text-center py-6 px-3">
                  <Users size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Nenhum membro disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ═══════ Search Bar ═══════ */}
          {buscaMsgAberta && (
            <div className="px-3 pt-2 pb-1 bg-white border-b border-slate-100 flex items-center gap-2">
              <Search size={13} className="text-slate-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={buscaMensagem}
                onChange={e => setBuscaMensagem(e.target.value)}
                placeholder="Buscar nas mensagens..."
                className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
              />
              {buscaMensagem && (
                <span className="text-[10px] text-slate-400 flex-shrink-0">{mensagensFiltradas.length} resultado{mensagensFiltradas.length !== 1 ? 's' : ''}</span>
              )}
              <button onClick={() => { setBuscaMsgAberta(false); setBuscaMensagem(''); }} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={13} />
              </button>
            </div>
          )}
          {/* ═══════ Messages Area ═══════ */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 bg-gradient-to-b from-slate-50/50 to-white">
            {carregando ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Carregando mensagens...</p>
              </div>
            ) : mensagens.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="bg-slate-100 rounded-full p-4">
                  <MessageCircle size={28} className="text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-500">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-slate-400 mt-0.5">Envie a primeira mensagem!</p>
                </div>
              </div>
            ) : (
              mensagensFiltradas.map((msg, idx) => {
                const isMine = msg.remetente_id === usuario?.id;
                const consecutive = isConsecutive(mensagensFiltradas, idx);
                const showDate = shouldShowDateSeparator(mensagensFiltradas, idx);
                const isDeleted = msg.tipo === 'deletado';
                const msgReacoes = reacoesPorMsg[msg.id] || [];
                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[10px] font-medium text-slate-400 bg-white px-2">
                          {formatDateSeparator(msg.criado_em)}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}
                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${consecutive ? 'mt-0.5' : 'mt-3'} group`}>
                      {/* Avatar for other users (only shown when not consecutive) */}
                      {!isMine && !consecutive && (
                        <div className={`bg-gradient-to-br ${getAvatarColor(msg.remetente_nome)} rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 mr-2 mt-5 shadow-sm`}>
                          <span className="text-white text-[10px] font-bold">{msg.remetente_nome.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      {!isMine && consecutive && <div className="w-7 mr-2 flex-shrink-0" />}
                      <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                        {!isMine && !consecutive && (
                          <p className="text-[10px] font-semibold text-slate-500 mb-1 ml-1">{msg.remetente_nome}</p>
                        )}

                        {isDeleted ? (
                          /* ── Deleted message placeholder ── */
                          <div className={`px-3.5 py-2 text-[13px] leading-relaxed rounded-2xl border border-dashed ${
                            isMine ? 'bg-slate-100 border-slate-300 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}>
                            <span className="italic flex items-center gap-1.5">
                              <Trash2 size={11} className="opacity-50" />
                              Mensagem apagada
                            </span>
                          </div>
                        ) : (
                          /* ── Normal message bubble ── */
                          <div className={`px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${
                            isMine
                              ? `bg-gradient-to-br from-blue-600 to-blue-700 text-white ${consecutive ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-br-md'}`
                              : `bg-white text-slate-800 border border-slate-100 ${consecutive ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-bl-md'}`
                          }`}>
                            {/* Reply preview */}
                            {msg.resposta_conteudo && (
                              <div className={`text-[10px] mb-2 px-2.5 py-1.5 rounded-lg border-l-2 ${
                                isMine
                                  ? 'bg-blue-500/30 border-blue-300 text-blue-100'
                                  : 'bg-slate-50 border-slate-300 text-slate-500'
                              }`}>
                                <p className="font-bold truncate">{msg.resposta_remetente_nome}</p>
                                <p className="truncate opacity-80">{msg.resposta_conteudo}</p>
                              </div>
                            )}
                            {/* File attachment */}
                            {msg.arquivo_url && (
                              msg.arquivo_tipo?.startsWith('image/')
                                ? (
                                  <img
                                    src={msg.arquivo_url}
                                    alt={msg.arquivo_nome ?? 'imagem'}
                                    className="max-w-full rounded-lg mb-1.5 max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
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
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isMine ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                  >
                                    {msg.conteudo?.includes('vídeo') ? <Video size={12} /> : <Phone size={12} />}
                                    {msg.arquivo_nome}
                                  </a>
                                ) : (
                                  <a
                                    href={msg.arquivo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 text-xs ${isMine ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                                  >
                                    <Paperclip size={11} />
                                    <span className="underline underline-offset-2">{msg.arquivo_nome}</span>
                                  </a>
                                )
                            )}
                            {/* Text content with link detection */}
                            {msg.conteudo && renderConteudoComLinks(msg.conteudo, isMine)}
                          </div>
                        )}

                        {/* ── Reaction badges ── */}
                        {msgReacoes.length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {msgReacoes.map(r => {
                              const jaReagi = r.userIds.includes(usuario?.id ?? '');
                              return (
                                <button
                                  key={r.emoji}
                                  onClick={() => toggleReacao(msg.id, r.emoji)}
                                  title={r.usuarios.join(', ')}
                                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all hover:scale-105 ${
                                    jaReagi
                                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{r.emoji}</span>
                                  <span className="text-[10px] font-medium">{r.userIds.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Time + actions row */}
                        {!isDeleted && (
                          <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'justify-end mr-1' : 'ml-1'}`}>
                            {/* Quick reactions */}
                            <div className="relative">
                              <button
                                onClick={() => setReacaoPickerAberto(reacaoPickerAberto === msg.id ? null : msg.id)}
                                className="p-0.5 text-slate-300 hover:text-amber-500 transition-colors"
                                title="Reagir"
                              >
                                <Smile size={10} />
                              </button>
                              {reacaoPickerAberto === msg.id && (
                                <div className={`absolute ${isMine ? 'right-0' : 'left-0'} bottom-full mb-1 flex items-center gap-0.5 bg-white border border-slate-200 rounded-full shadow-lg px-1.5 py-1 z-50`}>
                                  {QUICK_REACTIONS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReacao(msg.id, emoji)}
                                      className="w-6 h-6 flex items-center justify-center text-sm hover:bg-slate-100 rounded-full transition-colors active:scale-90"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => setRespostaParaMsg(msg)}
                              className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
                              title="Responder"
                            >
                              <CornerUpLeft size={10} />
                            </button>
                            {isMine && (
                              <button
                                onClick={() => { if (confirm('Apagar esta mensagem?')) deletarMensagem(msg.id); }}
                                className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                                title="Apagar"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                            <p className="text-[10px] text-slate-400">
                              {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {isMine && dmAtivo && msg.id === ultimaMinhaMensagemId && msg.lido && (
                              <>
                                <CheckCheck size={11} className="text-blue-400" />
                                <span className="text-[9px] text-blue-400 font-medium">Lido</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {/* Typing indicator */}
            {quemDigitando && (
              <div className="flex items-center gap-2 px-1 py-2 mt-2">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-3.5 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">{quemDigitando}</span>
                    <span className="flex gap-0.5 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══════ Input Area ═══════ */}
          <div className="border-t border-slate-100 p-3 bg-white flex-shrink-0">
            {/* Reply preview bar */}
            {respostaParaMsg && (
              <div className="flex items-center justify-between bg-blue-50/80 border-l-[3px] border-blue-500 px-3 py-2 rounded-lg mb-2 gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <CornerUpLeft size={12} className="text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-blue-600">{respostaParaMsg.remetente_nome}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {respostaParaMsg.conteudo || respostaParaMsg.arquivo_nome || '📎 arquivo'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setRespostaParaMsg(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-0.5 rounded hover:bg-slate-200/50 transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}

            {gravando ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelarGravacao}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
                  title="Cancelar"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-2 flex-1 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  <span className="text-sm text-red-600 font-medium tabular-nums">
                    {Math.floor(duracaoGravacao / 60).toString().padStart(2, '0')}:{(duracaoGravacao % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={pararGravacao}
                  className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0 shadow-sm shadow-red-500/25"
                  title="Enviar áudio"
                >
                  <Square size={14} fill="white" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={enviandoArquivo}
                  className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-40 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
                  title="Anexar arquivo"
                >
                  <Paperclip size={16} />
                </button>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setEmojiAberto(prev => !prev)}
                    className={`p-2 rounded-xl transition-colors ${emojiAberto ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    title="Emojis"
                  >
                    <Smile size={16} />
                  </button>
                  {emojiAberto && (
                    <div className="absolute bottom-full left-0 mb-2 w-[280px] max-h-[260px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="overflow-y-auto max-h-[260px] p-2">
                        {EMOJI_CATEGORIES.map(cat => (
                          <div key={cat.label} className="mb-2">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">{cat.label}</p>
                            <div className="flex flex-wrap gap-0.5">
                              {cat.emojis.map(e => (
                                <button
                                  key={e}
                                  onClick={() => inserirEmoji(e)}
                                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 rounded-lg transition-colors active:scale-90"
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                  onFocus={() => setEmojiAberto(false)}
                  placeholder={dmAtivo ? `Mensagem para ${dmAtivo.nome}...` : 'Mensagem no # geral...'}
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {texto.trim() ? (
                  <button
                    onClick={enviarMensagem}
                    disabled={enviandoArquivo}
                    className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-500/25 hover:shadow-md hover:shadow-blue-500/30 active:scale-95"
                  >
                    {enviandoArquivo
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send size={14} />
                    }
                  </button>
                ) : (
                  <button
                    onClick={iniciarGravacao}
                    disabled={enviandoArquivo}
                    className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40 transition-all active:scale-95"
                    title="Gravar áudio"
                  >
                    <Mic size={14} />
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
