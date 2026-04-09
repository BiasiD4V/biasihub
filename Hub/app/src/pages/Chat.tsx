import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Send, Plus, Search, X, Users, Hash, MessageCircle,
  ChevronLeft, MoreVertical, Reply, Check, CheckCheck, UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import { chatRepository, Canal, Mensagem, MembroCanal } from '../infrastructure/supabase/chatRepository';

// ─────────────────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────────────────
interface CanalComMeta extends Canal {
  ultimaMensagem?: string;
  ultimaAtividade?: string;
  naoLidas: number;
  outroNome?: string; // para DMs
}

interface UsuarioSimples {
  id: string;
  nome: string;
  papel: string;
  departamento?: string;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function formatHora(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatHoraCompleto(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function iconeTipo(tipo: Canal['tipo'], icone?: string) {
  if (icone && /\p{Emoji}/u.test(icone)) return icone;
  if (tipo === 'geral') return '🏢';
  if (tipo === 'setor') return '👥';
  if (tipo === 'grupo') return '💬';
  return '👤';
}

// ─────────────────────────────────────────────────────────
// Modal Criar Grupo
// ─────────────────────────────────────────────────────────
function ModalCriarGrupo({
  usuarioId,
  usuarioNome,
  todosUsuarios,
  onClose,
  onCriado,
}: {
  usuarioId: string;
  usuarioNome: string;
  todosUsuarios: UsuarioSimples[];
  onClose: () => void;
  onCriado: (c: Canal) => void;
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [icone, setIcone] = useState('💬');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const outros = todosUsuarios.filter(u => u.id !== usuarioId);
  const filtrados = outros.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase())
  );

  function toggleMembro(id: string) {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function salvar() {
    if (!nome.trim() || selecionados.length === 0) return;
    setSalvando(true);
    try {
      const canal = await chatRepository.criarGrupo(
        nome.trim(), descricao.trim(), icone, usuarioId, selecionados
      );
      onCriado(canal);
      onClose();
    } catch (e: any) {
      console.error('Erro ao criar grupo:', e);
      const msg = e?.message || e?.error_description || JSON.stringify(e) || 'Erro desconhecido';
      alert(`Erro ao criar grupo:\n${msg}`);
    } finally {
      setSalvando(false);
    }
  }

  const EMOJIS = ['💬','🚀','⚡','🏗️','📋','🔧','💡','🎯','📊','🛠️'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-slate-800">Novo Grupo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Ícone */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Ícone</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setIcone(e)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                    icone === e ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Nome do grupo *</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Equipe Comercial"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Descrição</label>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Opcional"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Membros */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
              Membros ({selecionados.length} selecionados)
            </label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar colaboradores..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filtrados.map(u => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selecionados.includes(u.id)}
                    onChange={() => toggleMembro(u.id)}
                    className="rounded"
                  />
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">
                      {u.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{u.nome}</p>
                    <p className="text-[10px] text-slate-400">{u.papel}</p>
                  </div>
                </label>
              ))}
              {filtrados.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4">Nenhum usuário encontrado</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={!nome.trim() || selecionados.length === 0 || salvando}
            className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? 'Criando...' : 'Criar Grupo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Componente de mensagem
// ─────────────────────────────────────────────────────────
function MensagemBolha({
  msg,
  isMinha,
  isGrupo,
  onResponder,
}: {
  msg: Mensagem;
  isMinha: boolean;
  isGrupo: boolean;
  onResponder: (msg: Mensagem) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`flex ${isMinha ? 'justify-end' : 'justify-start'} group mb-1`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`flex items-end gap-1 max-w-[75%] ${isMinha ? 'flex-row-reverse' : ''}`}>
        {/* Avatar (apenas grupos, outros) */}
        {isGrupo && !isMinha && (
          <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0 mb-1">
            <span className="text-white text-[9px] font-bold">
              {msg.remetente_nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Botão responder (hover) */}
        {hover && (
          <button
            onClick={() => onResponder(msg)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-all mb-1"
          >
            <Reply size={14} />
          </button>
        )}

        <div>
          {/* Nome remetente em grupos */}
          {isGrupo && !isMinha && (
            <p className="text-[10px] font-semibold text-blue-600 mb-0.5 px-1">
              {msg.remetente_nome}
            </p>
          )}

          {/* Balão */}
          <div
            className={`px-3 py-2 rounded-2xl text-sm shadow-sm ${
              isMinha
                ? 'bg-[#233772] text-white rounded-br-sm'
                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
            }`}
          >
            {/* Resposta citada */}
            {msg.resposta_conteudo && (
              <div className={`mb-1.5 px-2 py-1.5 rounded-lg text-xs border-l-2 ${
                isMinha
                  ? 'bg-white/10 border-[#FFC82D] text-white/80'
                  : 'bg-slate-50 border-blue-400 text-slate-500'
              }`}>
                <p className="font-semibold mb-0.5">
                  {msg.resposta_remetente_nome}
                </p>
                <p className="truncate">{msg.resposta_conteudo}</p>
              </div>
            )}

            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.conteudo}</p>

            {/* Hora */}
            <p className={`text-[10px] mt-1 text-right ${isMinha ? 'text-white/60' : 'text-slate-400'}`}>
              {formatHoraCompleto(msg.criado_em)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Componente principal: Chat
// ─────────────────────────────────────────────────────────
export function Chat() {
  const { usuario } = useAuth();
  const [canais, setCanais] = useState<CanalComMeta[]>([]);
  const [canalAtivo, setCanalAtivo] = useState<CanalComMeta | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<Mensagem | null>(null);
  const [buscaCanal, setBuscaCanal] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [todosUsuarios, setTodosUsuarios] = useState<UsuarioSimples[]>([]);
  const [membros, setMembros] = useState<MembroCanal[]>([]);
  const [mostrarMembros, setMostrarMembros] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false); // mobile: mostra canal
  const [carregando, setCarregando] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // ── Carregar canais ─────────────────────────────────
  const carregarCanais = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      const lista = await chatRepository.listarCanaisDoUsuario(usuario.id);

      // Busca última mensagem + não lidas para cada canal
      const comMeta = await Promise.all(
        lista.map(async (c) => {
          const [ultima, naoLidas] = await Promise.all([
            chatRepository.buscarUltimaMensagem(c.id),
            chatRepository.contarNaoLidas(c.id, usuario.id),
          ]);
          return {
            ...c,
            ultimaMensagem: ultima?.conteudo,
            ultimaAtividade: ultima?.criado_em,
            naoLidas,
          } as CanalComMeta;
        })
      );

      // Ordena por atividade recente (geral primeiro, depois por última mensagem)
      comMeta.sort((a, b) => {
        if (a.tipo === 'geral') return -1;
        if (b.tipo === 'geral') return 1;
        if (!a.ultimaAtividade && !b.ultimaAtividade) return 0;
        if (!a.ultimaAtividade) return 1;
        if (!b.ultimaAtividade) return -1;
        return new Date(b.ultimaAtividade).getTime() - new Date(a.ultimaAtividade).getTime();
      });

      setCanais(comMeta);

      // Abre canal geral por padrão se nenhum ativo
      if (!canalAtivo && comMeta.length > 0) {
        const geral = comMeta.find(c => c.tipo === 'geral') ?? comMeta[0];
        abrirCanal(geral);
      }
    } catch (e) {
      console.error('Erro ao carregar canais:', e);
    } finally {
      setCarregando(false);
    }
  }, [usuario?.id]);

  useEffect(() => {
    carregarCanais();
  }, [carregarCanais]);

  // ── Buscar todos usuários (para criar grupos/DMs) ──
  useEffect(() => {
    supabase
      .from('usuarios')
      .select('id, nome, papel, departamento')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setTodosUsuarios((data as UsuarioSimples[]) ?? []));
  }, []);

  // ── Abrir canal ─────────────────────────────────────
  async function abrirCanal(canal: CanalComMeta) {
    setCanalAtivo(canal);
    setPainelAberto(true);
    setMensagens([]);
    setMostrarMembros(false);

    // Cancela subscription anterior
    if (unsubRef.current) unsubRef.current();

    try {
      // Carrega mensagens
      const msgs = await chatRepository.listarMensagens(canal.id);
      setMensagens(msgs);

      // Marca como lido
      if (usuario?.id) {
        await chatRepository.marcarComoLido(canal.id, usuario.id);
        setCanais(prev => prev.map(c => c.id === canal.id ? { ...c, naoLidas: 0 } : c));
      }

      // Carrega membros se grupo/DM
      if (canal.tipo === 'grupo' || canal.tipo === 'dm') {
        const lista = await chatRepository.listarMembros(canal.id);
        setMembros(lista);
      }

      // Realtime
      unsubRef.current = chatRepository.inscreverMensagens(canal.id, (msg) => {
        setMensagens(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Marcar como lido automaticamente se painel aberto
        if (usuario?.id && msg.remetente_id !== usuario.id) {
          chatRepository.marcarComoLido(canal.id, usuario.id);
        }
      });
    } catch (e) {
      console.error('Erro ao abrir canal:', e);
    }
  }

  // ── Scroll ao fim ───────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // ── Enviar mensagem ─────────────────────────────────
  async function enviar() {
    if (!texto.trim() || !canalAtivo || !usuario || enviando) return;
    setEnviando(true);
    const conteudo = texto.trim();
    setTexto('');

    try {
      await chatRepository.enviarMensagem(
        canalAtivo.id,
        usuario.id,
        usuario.nome,
        conteudo,
        resposta ? {
          respostaId: resposta.id,
          respostaRemetenteNome: resposta.remetente_nome,
          respostaConteudo: resposta.conteudo,
        } : undefined
      );
      setResposta(null);
      // Atualiza última mensagem no painel
      setCanais(prev => prev.map(c =>
        c.id === canalAtivo.id
          ? { ...c, ultimaMensagem: `Você: ${conteudo}`, ultimaAtividade: new Date().toISOString() }
          : c
      ));
    } catch (e) {
      console.error('Erro ao enviar:', e);
    } finally {
      setEnviando(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  // ── Agrupar mensagens por data ──────────────────────
  function agruparPorData(msgs: Mensagem[]) {
    const grupos: { data: string; mensagens: Mensagem[] }[] = [];
    let dataAtual = '';

    for (const msg of msgs) {
      const d = new Date(msg.criado_em);
      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);

      let label: string;
      if (d.toDateString() === hoje.toDateString()) label = 'Hoje';
      else if (d.toDateString() === ontem.toDateString()) label = 'Ontem';
      else label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      if (label !== dataAtual) {
        grupos.push({ data: label, mensagens: [] });
        dataAtual = label;
      }
      grupos[grupos.length - 1].mensagens.push(msg);
    }
    return grupos;
  }

  const isGrupoOuGeral = canalAtivo?.tipo === 'grupo' || canalAtivo?.tipo === 'geral' || canalAtivo?.tipo === 'setor';

  const canalNome = canalAtivo ? (
    canalAtivo.tipo === 'dm'
      ? membros.find(m => m.usuario_id !== usuario?.id)?.nome ?? 'Conversa'
      : canalAtivo.nome
  ) : '';

  const canalIcone = canalAtivo ? iconeTipo(canalAtivo.tipo, canalAtivo.icone) : '';

  const canaisFiltrados = canais.filter(c =>
    c.nome.toLowerCase().includes(buscaCanal.toLowerCase())
  );

  // ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* ── Painel esquerdo: canais ─────────────────── */}
      <div className={`
        flex-shrink-0 w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col
        ${painelAberto ? 'hidden lg:flex' : 'flex'}
      `}>
        {/* Header esquerdo */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-base">Chat</h2>
            <button
              onClick={() => setMostrarModal(true)}
              className="p-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title="Criar grupo"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={buscaCanal}
              onChange={e => setBuscaCanal(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lista de canais */}
        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Carregando...</div>
          ) : canaisFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
              <MessageCircle size={28} className="opacity-40" />
              <span>Nenhuma conversa</span>
            </div>
          ) : (
            <div>
              {/* Geral */}
              {canaisFiltrados.filter(c => c.tipo === 'geral').map(c => (
                <CanalItem
                  key={c.id}
                  canal={c}
                  ativo={canalAtivo?.id === c.id}
                  onClick={() => abrirCanal(c)}
                />
              ))}

              {/* Setores */}
              {canaisFiltrados.filter(c => c.tipo === 'setor').length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Setores
                  </div>
                  {canaisFiltrados.filter(c => c.tipo === 'setor').map(c => (
                    <CanalItem key={c.id} canal={c} ativo={canalAtivo?.id === c.id} onClick={() => abrirCanal(c)} />
                  ))}
                </>
              )}

              {/* Grupos */}
              {canaisFiltrados.filter(c => c.tipo === 'grupo').length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Grupos
                  </div>
                  {canaisFiltrados.filter(c => c.tipo === 'grupo').map(c => (
                    <CanalItem key={c.id} canal={c} ativo={canalAtivo?.id === c.id} onClick={() => abrirCanal(c)} />
                  ))}
                </>
              )}

              {/* Conversas DM */}
              {canaisFiltrados.filter(c => c.tipo === 'dm').length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Conversas
                  </div>
                  {canaisFiltrados.filter(c => c.tipo === 'dm').map(c => (
                    <CanalItem key={c.id} canal={c} ativo={canalAtivo?.id === c.id} onClick={() => abrirCanal(c)} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Botão nova conversa */}
        <div className="p-3 border-t border-slate-100">
          <NovaConversaBtn todosUsuarios={todosUsuarios} usuarioId={usuario?.id ?? ''} usuarioNome={usuario?.nome ?? ''} onAbrir={async (uid) => {
            if (!usuario?.id) return;
            try {
              const dm = await chatRepository.criarDM(usuario.id, uid);
              await carregarCanais();
              // Encontra o canal criado e abre
              const found = { ...dm, naoLidas: 0 } as CanalComMeta;
              abrirCanal(found);
            } catch (e) {
              console.error(e);
            }
          }} />
        </div>
      </div>

      {/* ── Área de mensagens ───────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!painelAberto ? 'hidden lg:flex' : 'flex'}`}>
        {canalAtivo ? (
          <>
            {/* Header do canal */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
              <button
                className="lg:hidden p-1.5 rounded-xl hover:bg-slate-100 text-slate-500"
                onClick={() => setPainelAberto(false)}
              >
                <ChevronLeft size={20} />
              </button>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                {canalIcone}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{canalNome}</p>
                <p className="text-[10px] text-slate-400">
                  {canalAtivo.tipo === 'geral' ? 'Canal de toda a empresa' :
                   canalAtivo.tipo === 'setor' ? 'Canal de setor' :
                   canalAtivo.tipo === 'grupo' ? `${membros.length} membros` :
                   'Conversa direta'}
                </p>
              </div>
              {(canalAtivo.tipo === 'grupo') && (
                <button
                  onClick={() => setMostrarMembros(!mostrarMembros)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                >
                  <Users size={18} />
                </button>
              )}
            </div>

            {/* Painel de membros (grupo) */}
            {mostrarMembros && (
              <div className="bg-white border-b border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">Membros ({membros.length})</p>
                <div className="flex flex-wrap gap-2">
                  {membros.map(m => (
                    <div key={m.usuario_id} className="flex items-center gap-1.5 bg-slate-50 rounded-full px-2 py-1">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">
                          {m.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-700">{m.nome.split(' ')[0]}</span>
                      {m.papel === 'admin' && (
                        <span className="text-[8px] text-blue-600 font-bold">ADM</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
              {mensagens.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <MessageCircle size={40} className="opacity-30" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-xs">Seja o primeiro a enviar uma mensagem!</p>
                </div>
              )}

              {agruparPorData(mensagens).map(grupo => (
                <div key={grupo.data}>
                  {/* Separador de data */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] text-slate-400 bg-white px-2 rounded-full border border-slate-200">
                      {grupo.data}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {grupo.mensagens.map(msg => (
                    <MensagemBolha
                      key={msg.id}
                      msg={msg}
                      isMinha={msg.remetente_id === usuario?.id}
                      isGrupo={isGrupoOuGeral ?? false}
                      onResponder={setResposta}
                    />
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-slate-200 px-4 py-3">
              {/* Citação de resposta */}
              {resposta && (
                <div className="flex items-center gap-2 mb-2 bg-blue-50 rounded-xl px-3 py-2">
                  <Reply size={14} className="text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-blue-600">{resposta.remetente_nome}</p>
                    <p className="text-xs text-slate-600 truncate">{resposta.conteudo}</p>
                  </div>
                  <button onClick={() => setResposta(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Mensagem em ${canalNome}...`}
                  rows={1}
                  className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-24 overflow-y-auto"
                  style={{ height: 'auto', minHeight: '40px' }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 96) + 'px';
                  }}
                />
                <button
                  onClick={enviar}
                  disabled={!texto.trim() || enviando}
                  className="p-2.5 bg-[#233772] text-white rounded-2xl hover:bg-[#1a2b5c] disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[9px] text-slate-300 mt-1 text-right">Enter para enviar · Shift+Enter para nova linha</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <MessageCircle size={48} className="opacity-20" />
            <p className="font-medium">Selecione uma conversa</p>
            <p className="text-sm text-slate-300">ou crie um novo grupo</p>
          </div>
        )}
      </div>

      {/* Modal criar grupo */}
      {mostrarModal && usuario && (
        <ModalCriarGrupo
          usuarioId={usuario.id}
          usuarioNome={usuario.nome}
          todosUsuarios={todosUsuarios}
          onClose={() => setMostrarModal(false)}
          onCriado={async (canal) => {
            await carregarCanais();
            const found = { ...canal, naoLidas: 0 } as CanalComMeta;
            abrirCanal(found);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Item de canal na lista
// ─────────────────────────────────────────────────────────
function CanalItem({ canal, ativo, onClick }: { canal: CanalComMeta; ativo: boolean; onClick: () => void }) {
  const icone = iconeTipo(canal.tipo, canal.icone);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        ativo ? 'bg-blue-50 border-r-2 border-blue-600' : 'hover:bg-slate-50'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
        ativo ? 'bg-blue-100' : 'bg-slate-100'
      }`}>
        {icone}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${ativo ? 'font-semibold text-blue-700' : 'font-medium text-slate-700'}`}>
            {canal.nome}
          </p>
          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
            {formatHora(canal.ultimaAtividade)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-400 truncate flex-1 mr-2">
            {canal.ultimaMensagem ?? <span className="italic">Sem mensagens</span>}
          </p>
          {(canal.naoLidas ?? 0) > 0 && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
              {canal.naoLidas > 9 ? '9+' : canal.naoLidas}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Botão de nova conversa DM
// ─────────────────────────────────────────────────────────
function NovaConversaBtn({
  todosUsuarios,
  usuarioId,
  usuarioNome,
  onAbrir,
}: {
  todosUsuarios: UsuarioSimples[];
  usuarioId: string;
  usuarioNome: string;
  onAbrir: (uid: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const outros = todosUsuarios
    .filter(u => u.id !== usuarioId)
    .filter(u => u.nome.toLowerCase().includes(busca.toLowerCase()));

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <UserPlus size={15} />
        Nova conversa
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar colaborador..."
          className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => setAberto(false)} className="text-slate-400"><X size={15} /></button>
      </div>
      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {outros.slice(0, 8).map(u => (
          <button
            key={u.id}
            onClick={() => { onAbrir(u.id); setAberto(false); setBusca(''); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 text-left"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">
                {u.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-slate-700 truncate">{u.nome}</span>
          </button>
        ))}
        {outros.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-2">Nenhum colaborador encontrado</p>
        )}
      </div>
    </div>
  );
}
