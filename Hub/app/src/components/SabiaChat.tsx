import { useState, useEffect, useRef } from 'react';
import { Bird, X, Send, HelpCircle, Layers, Package, FileText, CalendarDays } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Mensagem {
  id: string;
  role: 'user' | 'assistant';
  texto: string;
  data: Date;
}

const SUGESTOES = [
  'O que é o BiasíHub?',
  'Como acessar o Almoxarifado?',
  'O que faz o módulo Comercial?',
  'Como configurar a IA?',
];

const SUGESTAO_ICONS = [HelpCircle, Layers, Package, FileText];

function respostaFallback(pergunta: string): string {
  const q = pergunta.toLowerCase();
  if (q.includes('almoxarifado') || q.includes('estoque') || q.includes('igor')) {
    return 'O Almoxarifado gerencia entradas e saídas de materiais, solicitações de obras e inventário. Você pode acessá-lo pelo Portal. O Igor é o assistente IA do Almoxarifado.';
  }
  if (q.includes('comercial') || q.includes('orçamento') || q.includes('paulo')) {
    return 'O módulo Comercial gerencia propostas, clientes e pipeline de vendas. O Paulo é o assistente IA do Comercial.';
  }
  if (q.includes('hub') || q.includes('portal')) {
    return 'O Hub é o portal central do BiasíHub. Aqui você acessa todos os módulos, gerencia seu perfil e dispositivos, e configura os assistentes de IA.';
  }
  if (q.includes('ia') || q.includes('inteligência') || q.includes('ollama') || q.includes('anthropic')) {
    return 'A IA do BiasíHub usa Ollama (local, gratuito) como principal provedor, com fallback para Anthropic Claude. Configure em Meus Dispositivos.';
  }
  return 'Sou o Sabiá, assistente do BiasíHub! No momento estou sem conexão com a IA. Configure o Ollama ou uma chave Anthropic em Meus Dispositivos para respostas mais completas.';
}

interface SabiaChatProps {
  aberto: boolean;
  onFechar: () => void;
}

export function SabiaChat({ aberto, onFechar }: SabiaChatProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [entrada, setEntrada] = useState('');
  const [carregando, setCarregando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      setMensagens([{
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        texto: 'Olá! Sou o Sabiá 🐦 — assistente do BiasíHub. Conheço todos os módulos do sistema e estou aqui para tirar suas dúvidas. Como posso ajudar?',
        data: new Date(),
      }]);
    }
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aberto]);

  useEffect(() => {
    if (aberto) {
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [aberto, onFechar]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);

  async function enviar(texto: string) {
    const p = texto.trim();
    if (!p || carregando) return;

    const historico = mensagens
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.texto }));

    setMensagens(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', texto: p, data: new Date() }]);
    setEntrada('');
    setCarregando(true);

    try {
      const res = await fetch('app://hub.local/api/sabia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: p, historico }),
      });

      let textoResposta: string;
      if (res.ok) {
        const data = await res.json();
        textoResposta = data.resposta || respostaFallback(p);
      } else {
        textoResposta = respostaFallback(p);
      }

      setMensagens(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', texto: textoResposta, data: new Date() }]);
    } catch {
      setMensagens(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', texto: respostaFallback(p), data: new Date() }]);
    } finally {
      setCarregando(false);
    }
  }

  if (!aberto) return null;

  const content = (
    <div className="fixed inset-0 z-[10000] flex justify-end pointer-events-none overflow-hidden">
      {/* Overlay */}
      <div
        onClick={onFechar}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto transition-opacity"
      />

      {/* Panel */}
      <div className="relative pointer-events-auto w-full sm:w-[480px] h-screen bg-slate-900 shadow-[-20px_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden border-l border-white/10 isolate">

        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/8 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

        {/* Header */}
        <div className="relative z-20 px-7 pt-10 pb-7 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FFC82D]/15 border-2 border-[#FFC82D]/30 flex items-center justify-center text-[#FFC82D] shadow-2xl shadow-amber-500/20">
                <Bird size={30} />
              </div>
              <div>
                <h3 className="text-white text-2xl font-black tracking-tighter uppercase leading-none">Sabiá</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFC82D]/15 text-[#FFC82D] border border-[#FFC82D]/25 uppercase tracking-[0.2em]">Assistente Hub</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BiasíHub</span>
                </div>
              </div>
            </div>
            <button
              onClick={onFechar}
              className="w-11 h-11 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-white hover:bg-rose-500 hover:border-rose-400 transition-all group shadow-xl"
              title="Fechar"
            >
              <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Module chips */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            {[
              { icon: Layers, label: 'Hub' },
              { icon: Package, label: 'Almox.' },
              { icon: FileText, label: 'Comerc.' },
              { icon: CalendarDays, label: 'Reuniões' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-center opacity-50 hover:opacity-100 transition-all cursor-help">
                <item.icon size={16} className="mx-auto mb-1.5 text-slate-300" />
                <p className="text-[8px] font-black text-white uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions (shown only at start) */}
        {mensagens.length <= 1 && (
          <div className="relative z-20 px-7 py-5 border-b border-white/5 bg-slate-950/30">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Perguntas frequentes</p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s, idx) => {
                const Icon = SUGESTAO_ICONS[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => enviar(s)}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:border-[#FFC82D]/40 hover:text-white hover:bg-[#FFC82D]/10 transition-all uppercase tracking-wide"
                  >
                    <Icon size={12} />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-7 py-7 space-y-5 custom-scrollbar">
          {mensagens.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-[#FFC82D]/15 border border-[#FFC82D]/25 flex items-center justify-center text-[#FFC82D] mr-2 mt-1 flex-shrink-0">
                  <Bird size={14} />
                </div>
              )}
              <div className={`max-w-[82%] rounded-[22px] px-5 py-3.5 text-[14px] leading-relaxed shadow-xl ${
                msg.role === 'user'
                  ? 'bg-amber-500 text-white font-medium rounded-tr-none border border-amber-400'
                  : 'bg-white/5 border border-white/10 text-slate-100 rounded-tl-none backdrop-blur-sm'
              }`}>
                {msg.texto}
              </div>
            </div>
          ))}
          {carregando && (
            <div className="flex justify-start items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#FFC82D]/15 border border-[#FFC82D]/25 flex items-center justify-center text-[#FFC82D] flex-shrink-0">
                <Bird size={14} />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[22px] rounded-tl-none px-5 py-4">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-duration:1s]" />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {/* Input */}
        <div className="relative z-20 p-7 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          <div className="relative flex items-center group">
            <input
              ref={inputRef}
              type="text"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar(entrada)}
              placeholder="Tire sua dúvida sobre o BiasíHub..."
              className="w-full bg-white/5 border-2 border-white/10 rounded-[26px] px-6 py-4 text-white text-[14px] focus:outline-none focus:border-amber-500/40 focus:bg-amber-500/5 transition-all pr-14 shadow-inner placeholder-slate-500"
            />
            <button
              onClick={() => enviar(entrada)}
              disabled={carregando || !entrada.trim()}
              className="absolute right-3 w-11 h-11 rounded-2xl bg-[#FFC82D] text-slate-900 flex items-center justify-center hover:bg-amber-400 transition-all shadow-lg hover:shadow-amber-500/40 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] mt-5">BiasiHub Singularity Edition</p>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
