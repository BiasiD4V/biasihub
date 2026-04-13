import React from 'react';
import { X, Send, Paperclip, CornerUpLeft, Mic, Square, Smile } from 'lucide-react';
import type { Membro, Mensagem } from './chatTypes';

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Mais usados', emojis: ['\u{1F600}','\u{1F602}','\u{1F60D}','\u{1F970}','\u{1F60E}','\u{1F62D}','\u{1F923}','\u{1F605}','\u{1F64F}','\u{1F44D}','\u{1F44B}','\u{2764}\u{FE0F}','\u{1F525}','\u{1F389}','\u{2705}','\u{1F44F}','\u{1F4AA}','\u{1F91D}','\u{1F440}','\u{1F4AF}'] },
  { label: 'Rostos', emojis: ['\u{1F60A}','\u{1F601}','\u{1F606}','\u{1F929}','\u{1F618}','\u{1F60B}','\u{1F914}','\u{1F928}','\u{1F610}','\u{1F611}','\u{1F644}','\u{1F60F}','\u{1F62C}','\u{1F634}','\u{1F92E}','\u{1F92F}','\u{1F973}','\u{1F607}','\u{1F917}','\u{1FAE1}'] },
  { label: 'Gestos', emojis: ['\u{1F44D}','\u{1F44E}','\u{1F44C}','\u{270C}\u{FE0F}','\u{1F91E}','\u{1F919}','\u{1F44B}','\u{1F590}\u{FE0F}','\u{1F64C}','\u{1F44F}','\u{1F91D}','\u{1F4AA}','\u{1F64F}','\u{261D}\u{FE0F}','\u{1F446}','\u{1F447}','\u{1F448}','\u{1F449}','\u{1FAF6}','\u{270A}'] },
  { label: 'Coracoes', emojis: ['\u{2764}\u{FE0F}','\u{1F9E1}','\u{1F49B}','\u{1F49A}','\u{1F499}','\u{1F49C}','\u{1F5A4}','\u{1F90D}','\u{1F494}','\u{2763}\u{FE0F}','\u{1F495}','\u{1F49E}','\u{1F493}','\u{1F497}','\u{1F496}','\u{1F498}','\u{1F49D}','\u{2665}\u{FE0F}','\u{1FA77}','\u{1FA75}'] },
  { label: 'Objetos', emojis: ['\u{1F389}','\u{1F38A}','\u{1F381}','\u{1F3C6}','\u{2B50}','\u{1F31F}','\u{1F4A1}','\u{1F4CC}','\u{1F4CE}','\u{270F}\u{FE0F}','\u{1F4DD}','\u{1F4CA}','\u{1F4C8}','\u{1F4B0}','\u{1F4BC}','\u{1F511}','\u{1F514}','\u{1F4F1}','\u{1F4BB}','\u{23F0}'] },
  { label: 'Simbolos', emojis: ['\u{2705}','\u{274C}','\u{26A0}\u{FE0F}','\u{1F6AB}','\u{1F4AF}','\u{203C}\u{FE0F}','\u{2753}','\u{2757}','\u{1F525}','\u{1F4A5}','\u{2728}','\u{1F3AF}','\u{1F197}','\u{1F195}','\u{1F534}','\u{1F7E2}','\u{1F7E1}','\u{2B06}\u{FE0F}','\u{2B07}\u{FE0F}','\u{27A1}\u{FE0F}'] },
];

export interface ChatInputProps {
  texto: string;
  dmAtivo: Membro | null;
  respostaParaMsg: Mensagem | null;
  enviandoArquivo: boolean;
  gravando: boolean;
  duracaoGravacao: number;
  emojiAberto: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onHandleTextoChange: (val: string) => void;
  onEnviarMensagem: () => void;
  onEnviarArquivo: (file: File) => void;
  onSetRespostaParaMsg: (msg: Mensagem | null) => void;
  onSetEmojiAberto: (val: boolean | ((prev: boolean) => boolean)) => void;
  onInserirEmoji: (emoji: string) => void;
  onIniciarGravacao: () => void;
  onPararGravacao: () => void;
  onCancelarGravacao: () => void;
}

export function ChatInput({
  texto,
  dmAtivo,
  respostaParaMsg,
  enviandoArquivo,
  gravando,
  duracaoGravacao,
  emojiAberto,
  fileInputRef,
  onHandleTextoChange,
  onEnviarMensagem,
  onEnviarArquivo,
  onSetRespostaParaMsg,
  onSetEmojiAberto,
  onInserirEmoji,
  onIniciarGravacao,
  onPararGravacao,
  onCancelarGravacao,
}: ChatInputProps) {
  return (
    <div className="bg-slate-900 border-t border-slate-700 p-4 sm:p-6 flex-shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Reply preview bar - Ultra Tech */}
      {respostaParaMsg && (
        <div className="flex items-center justify-between bg-slate-800 border border-indigo-500/40 px-4 py-3 rounded-2xl mb-4 gap-3 animate-in fade-in zoom-in-95 duration-300">
          <div className="min-w-0 flex items-center gap-3">
            <CornerUpLeft size={14} className="text-indigo-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Respondendo a {respostaParaMsg.remetente_nome}</p>
              <p className="text-xs font-black text-slate-200 truncate opacity-100 uppercase tracking-tight">
                {respostaParaMsg.conteudo || respostaParaMsg.arquivo_nome || 'Transmissao de arquivo'}
              </p>
            </div>
          </div>
          <button onClick={() => onSetRespostaParaMsg(null)} className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-200 hover:text-rose-300 transition-all hover:scale-110">
            <X size={14} />
          </button>
        </div>
      )}

      {gravando ? (
        <div className="flex items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
          <button
            onClick={onCancelarGravacao}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-700 text-slate-200 hover:text-rose-300 transition-all active:scale-90"
            title="Abortar"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-4 flex-1 px-6 py-3 bg-slate-800 border-2 border-rose-500/20 rounded-[28px] relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-rose-500/5 animate-pulse" />
             <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)] relative z-10" />
             <span className="text-xs font-black text-rose-600 uppercase tracking-[0.3em] tabular-nums relative z-10">
               Transmissao de audio: {Math.floor(duracaoGravacao / 60).toString().padStart(2, '0')}:{(duracaoGravacao % 60).toString().padStart(2, '0')}
             </span>
          </div>
          <button
            onClick={onPararGravacao}
            className="w-12 h-12 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/30 flex items-center justify-center active:scale-90"
            title="Finalizar"
          >
            <Square size={16} fill="white" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-2xl border border-slate-700 group-focus-within:border-indigo-400/40 transition-all">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={enviandoArquivo}
                className="w-10 h-10 flex items-center justify-center text-slate-200 hover:text-indigo-300 hover:bg-slate-700 rounded-[14px] transition-all disabled:opacity-30"
                title="Anexar Dados"
              >
                {enviandoArquivo ? <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /> : <Paperclip size={18} />}
              </button>
              
              <div className="relative">
                <button
                  onClick={() => onSetEmojiAberto(prev => !prev)}
                  className={`w-10 h-10 flex items-center justify-center rounded-[14px] transition-all ${emojiAberto ? 'text-amber-300 bg-slate-700 shadow-sm' : 'text-slate-300 hover:text-amber-300 hover:bg-slate-700'}`}
                  title="Expressao"
                >
                  <Smile size={18} />
                </button>
                {emojiAberto && (
                  <div className="absolute bottom-full left-0 mb-4 w-[280px] bg-slate-800 border border-slate-600 rounded-[32px] shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="overflow-y-auto max-h-[280px] p-4 custom-scrollbar">
                      {EMOJI_CATEGORIES.map(cat => (
                        <div key={cat.label} className="mb-4 last:mb-0">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-1 mb-2">{cat.label}</p>
                          <div className="grid grid-cols-6 gap-1">
                            {cat.emojis.map(e => (
                              <button
                                key={e}
                                onClick={() => onInserirEmoji(e)}
                                className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-700 rounded-xl transition-all active:scale-90"
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
           </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) { onEnviarArquivo(f); e.target.value = ''; }
            }}
          />
          
          <div className="flex-1 relative group">
            <input
              type="text"
              value={texto}
              onChange={e => onHandleTextoChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnviarMensagem(); } }}
              onFocus={() => onSetEmojiAberto(false)}
              placeholder={dmAtivo ? `Criptografar para ${dmAtivo.nome}...` : 'Transmitir no #Geral...'}
              className="w-full h-12 px-6 text-sm font-black text-slate-100 bg-slate-800 border-2 border-slate-700 rounded-[24px] focus:outline-none focus:border-indigo-400 focus:bg-slate-800 transition-all placeholder:text-slate-400 placeholder:uppercase placeholder:tracking-widest"
            />
            <div className="absolute inset-0 rounded-[24px] pointer-events-none border-2 border-transparent group-focus-within:border-indigo-400/30 group-hover:border-slate-600 transition-all duration-500" />
          </div>

          <button
            onClick={texto.trim() ? onEnviarMensagem : onIniciarGravacao}
            disabled={enviandoArquivo}
            className={`w-12 h-12 flex items-center justify-center rounded-[24px] transition-all duration-300 shadow-xl active:scale-90 ${
              texto.trim() 
                ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-indigo-600/10' 
                : 'bg-slate-800 text-slate-200 hover:text-indigo-300 hover:bg-slate-700 hover:border-indigo-400/30 border border-slate-700'
            }`}
          >
            {texto.trim() ? (
              enviandoArquivo ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />
            ) : (
              <Mic size={18} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

