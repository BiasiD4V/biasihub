import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Bot, X, Send, LayoutGrid, Building2, 
  ShieldCheck, Sparkles
} from 'lucide-react';
import { createPortal } from 'react-dom';

/* ══════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ══════════════════════════════════════════════════════════════ */
interface Mensagem {
  id: string;
  role: 'user' | 'assistant';
  texto: string;
  data: Date;
  perguntaOrigem?: string;
}

type MensagemPaulo = Mensagem;

interface Dica {
  pergunta: string;
  resposta: string;
}

interface DicaPagina {
  titulo: string;
  descricao: string;
  dicas: Dica[];
}



const DICAS: Record<string, DicaPagina> = {
  '/dashboard': {
    titulo: 'Dashboard BI',
    descricao: 'Visao geral de indicadores comerciais e performance.',
    dicas: [
      { pergunta: 'O que sao os cards?', resposta: 'Saopa indicadores rapidos: Total de propostas, Fechadas (Ganhos), Valor Total e Taxa de Conversao no recorte selecionado.' },
      { pergunta: 'Como filtro os dados?', resposta: 'Use os chips de filtro no topo para recortar por Ano, Status, Responsavel ou Disciplina.' },
    ],
  },
  '/orcamentos': {
    titulo: 'Gestao de Orcamentos',
    descricao: 'Listagem e controle de todas as propostas comerciais.',
    dicas: [
      { pergunta: 'Como criar novo orcamento?', resposta: 'Clique em "Novo Orcamento" no topo. Voce precisara definir o cliente, objeto e responsavel inicial.' },
      { pergunta: 'Onde vejo detalhes?', resposta: 'Clique em qualquer linha da tabela para abrir a ficha completa do orcamento.' },
    ],
  },
  '/orcamentos/detalhe': {
    titulo: 'Ficha do Orcamento',
    descricao: 'Informacoes detalhadas, valores e logs de uma proposta.',
    dicas: [
      { pergunta: 'Como alterar o status?', resposta: 'Use o seletor de status no cabecalho da ficha. Alteracoes sao salvas automaticamente no log.' },
      { pergunta: 'Onde anexo documentos?', resposta: 'Na aba de Documentos ou Arquivos dentro da ficha do orcamento.' },
    ],
  },
  '/aprovacoes': {
    titulo: 'Aprovacoes',
    descricao: 'Fluxo de aprovacao de propostas.',
    dicas: [
      { pergunta: 'Como saber o status atual?', resposta: 'A lista mostra o estado de aprovacao e quem esta responsavel no momento.' },
    ],
  },
  '/membros': {
    titulo: 'Membros',
    descricao: 'Gestao de usuarios e permissoes.',
    dicas: [
      { pergunta: 'Quem pode alterar membros?', resposta: 'Normalmente perfis administrativos com permissao de gestao de usuarios.' },
    ],
  },
};

function getDicasPorRota(pathname: string): DicaPagina {
  if (DICAS[pathname]) return DICAS[pathname];
  const rotasOrdenadas = Object.keys(DICAS).sort((a, b) => b.length - a.length);
  const rotaPrefixo = rotasOrdenadas.find((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
  if (rotaPrefixo) return DICAS[rotaPrefixo];
  return {
    titulo: 'Ajuda',
    descricao: 'Dicas de uso desta tela.',
    dicas: [
      { pergunta: 'Como usar esta pagina?', resposta: 'Use os filtros e acoes da propria tela. Se precisar, abra uma pagina principal pelo menu para ver dicas mais detalhadas.' },
    ],
  };
}

function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function respostaLocal(pergunta: string, dicas: DicaPagina): string {
  const q = normalizarTexto(pergunta);
  if (q.includes('oi') || q.includes('ola')) return `OI! EU SOU O PAULO ELITE. PROTOCOLO COMERCIAL ATIVO EM: ${dicas.titulo}.`;
  if (q.includes('como faz') || q.includes('passo a passo')) return `Para ${dicas.titulo}: 1. Verifique os dados atuais; 2. Use as acoes de topo; 3. Salve para registrar.`;
  return `Entendi seu ponto sobre ${dicas.titulo}. Me de mais detalhes do que voce precisa fazer.`;
}

function mensagemBoasVindas(dicas: DicaPagina): MensagemPaulo {
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    texto: `OI! EU SOU O PAULO ELITE. REDESIGN v4.0 SIDE-PANEL ATIVO. ESTAMOS EM: ${dicas.titulo}.`,
    data: new Date(),
  };
}

interface PauloAjudaProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT: PAULO ASSISTANT (ELITE SIDE-PANEL EDITION)
   ══════════════════════════════════════════════════════════════ */
export function PauloAjuda({ forceOpen, onClose }: PauloAjudaProps = {}) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemPaulo[]>([]);
  const [entrada, setEntrada] = useState('');
  const [carregandoResposta, setCarregandoResposta] = useState(false);
  const [sugestoes, setSugestoes] = useState<string[]>([]);

  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const mensagensFimRef = useRef<HTMLDivElement>(null);

  const dicas = useMemo(() => getDicasPorRota(location.pathname), [location.pathname]);

  useEffect(() => {
    if (forceOpen) setAberto(true);
  }, [forceOpen]);

  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      setMensagens([mensagemBoasVindas(dicas)]);
      setSugestoes(dicas.dicas.map(d => d.pergunta));
    }
  }, [aberto, dicas]);

  const fechar = () => {
    setAberto(false);
    onClose?.();
  };

  useEffect(() => {
    if (aberto) {
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [aberto]);

  useEffect(() => {
    mensagensFimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregandoResposta]);

  async function enviarPergunta(texto: string) {
    const p = texto.trim();
    if (!p || carregandoResposta) return;
    setMensagens(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', texto: p, data: new Date() }]);
    setEntrada('');
    setCarregandoResposta(true);
    
    // Simulate API delay for UX
    setTimeout(() => {
      setMensagens(prev => [...prev, { 
        id: `a-${Date.now()}`, 
        role: 'assistant', 
        texto: respostaLocal(p, dicas), 
        data: new Date(),
        perguntaOrigem: p 
      }]);
      setCarregandoResposta(false);
    }, 800);
  }

  if (!aberto) return null;

  const content = (
    <div className="fixed inset-0 z-[10000] flex justify-end pointer-events-none overflow-hidden">
      {/* Dark Overlay (clickable to close) */}
      <div 
        onClick={fechar}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto transition-opacity"
      />

      {/* Side Panel (Elite Slide-over) - 100% Height */}
      <div className="relative pointer-events-auto w-full sm:w-[500px] h-screen bg-[#060b1d] shadow-[-20px_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden border-l border-white/10 isolate">
        
        {/* Background Grid & Glow */}
        <div className="pointer-events-none absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute top-0 right-0 w-full h-[600px] bg-blue-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

        {/* Header - High Density Elite */}
        <div className="relative z-20 px-8 pt-12 pb-8 border-b border-white/10 bg-gradient-to-b from-white/10 to-transparent">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center text-sky-400 shadow-2xl backdrop-blur-xl">
                  <Bot size={32} />
               </div>
               <div>
                  <h3 className="text-white text-3xl font-black tracking-tighter uppercase leading-none">PAULO ELITE</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase tracking-[0.2em] shadow-lg shadow-sky-500/20">v4.0 Final</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocolo Comercial</span>
                  </div>
               </div>
            </div>
            <button
               onClick={fechar}
               className="w-12 h-12 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-white hover:bg-rose-500 hover:border-rose-400 transition-all group shadow-xl"
               title="Fechar Assistente"
            >
               <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: LayoutGrid, label: 'B.I.' }, { icon: Building2, label: 'Orc.' },
              { icon: ShieldCheck, label: 'Aprov.' }, { icon: Sparkles, label: 'Bira' }
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-help">
                <item.icon size={20} className="mx-auto mb-2 text-white" />
                <p className="text-[9px] font-black text-white uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions Bar */}
        {sugestoes.length > 0 && (
          <div className="relative z-20 px-8 py-5 border-b border-white/5 bg-slate-900/40 backdrop-blur-md">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Protocolos Recomendados</p>
            <div className="flex flex-wrap gap-2.5">
              {sugestoes.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => enviarPergunta(s)}
                  className="text-[11px] font-bold px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:border-sky-500/40 hover:text-white hover:bg-sky-500/10 transition-all uppercase tracking-wide"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Feed */}
        <div ref={panelRef} className="relative z-10 flex-1 overflow-y-auto px-8 py-8 space-y-6 custom-scrollbar">
          {mensagens.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-[24px] px-5 py-4 text-[14px] leading-relaxed shadow-2xl ${
                msg.role === 'user' 
                ? 'bg-sky-600 text-white font-medium rounded-tr-none border border-sky-500' 
                : 'bg-white/5 border border-white/10 text-slate-100 rounded-tl-none backdrop-blur-sm'
              }`}>
                {msg.texto}
              </div>
            </div>
          ))}
          {carregandoResposta && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-[24px] rounded-tl-none px-6 py-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-duration:1s]" />
                  <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={mensagensFimRef} />
        </div>

        {/* Input Area */}
        <div className="relative z-20 p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <div className="relative flex items-center group">
            <input
              type="text"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarPergunta(entrada)}
              placeholder="O que voce precisa no comercial?"
              className="w-full bg-white/5 border-2 border-white/10 rounded-[28px] px-8 py-5 text-white text-[15px] focus:outline-none focus:border-sky-500/50 focus:bg-sky-500/5 transition-all pr-16 shadow-inner"
            />
            <button
              onClick={() => enviarPergunta(entrada)}
              className="absolute right-4 w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center hover:bg-sky-500 transition-all shadow-lg hover:shadow-sky-600/40 active:scale-95 group-focus-within:bg-sky-500"
            >
              <Send size={22} />
            </button>
          </div>
          <p className="text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mt-6 animate-pulse">BiasiHub Singularity Edition</p>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
