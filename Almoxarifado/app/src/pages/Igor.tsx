import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Package, ClipboardList, Truck } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

interface Mensagem {
  papel: 'user' | 'assistant';
  conteudo: string;
  criado_em?: string;
}

const SUGESTOES = [
  { icone: Package, texto: 'O que está com estoque baixo?' },
  { icone: ClipboardList, texto: 'Tem requisições pendentes?' },
  { icone: Truck, texto: 'Como está a frota hoje?' },
];

const SAUDACOES_IGOR = [
  'Oi! Acabei de estudar os dados do almoxarifado. Me pergunte qualquer coisa!',
  'Olá! Estive analisando aqui e tenho bastante coisa pra te contar. O que quer saber?',
  'Ei! Sempre estudando aqui. Me pergunte o que precisar sobre estoque, frota, requisições...',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function Igor() {
  const { usuario } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState('');
  const [digitando, setDigitando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega histórico do Supabase
  useEffect(() => {
    async function carregarHistorico() {
      if (!usuario?.id) return;
      const { data } = await supabase
        .from('conversas_paulo')
        .select('papel, conteudo, criado_em')
        .eq('usuario_id', usuario.id)
        .order('criado_em', { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        setMensagens(data as Mensagem[]);
      } else {
        // Primeira vez - Igor se apresenta
        const saudacao = SAUDACOES_IGOR[Math.floor(Math.random() * SAUDACOES_IGOR.length)];
        const msg: Mensagem = { papel: 'assistant', conteudo: saudacao };
        setMensagens([msg]);
        if (usuario?.id) {
          supabase.from('conversas_paulo').insert({
            usuario_id: usuario.id,
            papel: 'assistant',
            conteudo: saudacao,
          }).then(() => {});
        }
      }
      setCarregando(false);
    }
    carregarHistorico();
  }, [usuario?.id]);

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, digitando]);

  async function enviar(texto?: string) {
    const msg = (texto || input).trim();
    if (!msg || digitando) return;

    setInput('');
    const novaMensagem: Mensagem = { papel: 'user', conteudo: msg };
    setMensagens(prev => [...prev, novaMensagem]);
    setDigitando(true);

    // Salva mensagem do usuário
    if (usuario?.id) {
      supabase.from('conversas_paulo').insert({
        usuario_id: usuario.id,
        papel: 'user',
        conteudo: msg,
      }).then(() => {});
    }

    try {
      const historico = mensagens.slice(-12).map(m => ({
        role: m.papel === 'user' ? 'user' : 'assistant',
        content: m.conteudo,
      }));

      const resp = await fetch('app://almoxarifado.local/api/paulo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: msg, historico }),
      });

      const data = await resp.json();
      const resposta = data.resposta || 'Não consegui processar sua mensagem.';

      const msgIgor: Mensagem = { papel: 'assistant', conteudo: resposta };
      setMensagens(prev => [...prev, msgIgor]);

      // Salva resposta do Igor
      if (usuario?.id) {
        supabase.from('conversas_paulo').insert({
          usuario_id: usuario.id,
          papel: 'assistant',
          conteudo: resposta,
        }).then(() => {});
      }
    } catch (err) {
      console.error('[Igor] erro:', err);
      setMensagens(prev => [
        ...prev,
        { papel: 'assistant', conteudo: 'Tive um problema de conexão. Tente novamente!' },
      ]);
    } finally {
      setDigitando(false);
      inputRef.current?.focus();
    }
  }

  async function limparConversa() {
    if (!usuario?.id) return;
    await supabase.from('conversas_paulo').delete().eq('usuario_id', usuario.id);
    const saudacao = SAUDACOES_IGOR[Math.floor(Math.random() * SAUDACOES_IGOR.length)];
    setMensagens([{ papel: 'assistant', conteudo: saudacao }]);
    supabase.from('conversas_paulo').insert({
      usuario_id: usuario.id,
      papel: 'assistant',
      conteudo: saudacao,
    }).then(() => {});
  }

  function formatarTexto(texto: string) {
    // Formata **negrito**, listas e quebras de linha
    return texto
      .split('\n')
      .map((linha, i) => {
        const negrito = linha.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        if (linha.startsWith('- ') || linha.startsWith('• ')) {
          return `<div key="${i}" class="flex gap-2"><span class="text-blue-400 mt-0.5">•</span><span>${negrito.replace(/^[-•]\s*/, '')}</span></div>`;
        }
        return `<p key="${i}" class="${i > 0 ? 'mt-1' : ''}">${negrito}</p>`;
      })
      .join('');
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Bot size={20} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-none">Igor</h1>
            <p className="text-xs text-green-500 font-medium mt-0.5 flex items-center gap-1">
              <Sparkles size={10} /> Sempre estudando
            </p>
          </div>
        </div>
        <button
          onClick={limparConversa}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Nova conversa"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
        {carregando ? (
          <div className="flex justify-center items-center h-full text-slate-400 text-sm">
            Carregando conversa...
          </div>
        ) : (
          <>
            {mensagens.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.papel === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  m.papel === 'assistant'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow'
                    : 'bg-slate-700'
                }`}>
                  {m.papel === 'assistant'
                    ? <Bot size={15} className="text-white" />
                    : <User size={15} className="text-white" />
                  }
                </div>

                {/* Balão */}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.papel === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100'
                }`}>
                  {m.papel === 'assistant' ? (
                    <div
                      className="prose-sm space-y-0.5"
                      dangerouslySetInnerHTML={{ __html: formatarTexto(m.conteudo) }}
                    />
                  ) : (
                    <p>{m.conteudo}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {digitando && (
              <div className="flex gap-3 flex-row">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-100 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Sugestões (só quando não há histórico longo) */}
      {mensagens.length <= 2 && !carregando && (
        <div className="px-4 py-3 flex gap-2 flex-wrap bg-slate-50 border-t border-slate-100 flex-shrink-0">
          {SUGESTOES.map(({ icone: Icon, texto }) => (
            <button
              key={texto}
              onClick={() => enviar(texto)}
              disabled={digitando}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-full hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              <Icon size={12} />
              {texto}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
        <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
            placeholder="Pergunte qualquer coisa para o Igor..."
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
            disabled={digitando}
          />
          <button
            onClick={() => enviar()}
            disabled={!input.trim() || digitando}
            className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          >
            {digitando ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Igor usa dados reais do almoxarifado para te ajudar
        </p>
      </div>
    </div>
  );
}

