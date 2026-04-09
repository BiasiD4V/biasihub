import React from 'react';
import { X, Send, Paperclip, CornerUpLeft, Mic, Square, Smile } from 'lucide-react';
import type { Membro, Mensagem } from './chatTypes';

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Mais usados', emojis: ['😀','😂','😍','🥰','😎','😭','🤣','😅','🙏','👍','👋','❤️','🔥','🎉','✅','👏','💪','🤝','👀','💯'] },
  { label: 'Rostos', emojis: ['😊','😁','😆','🤩','😘','😋','🤔','🤨','😐','😑','🙄','😏','😬','😴','🤮','🤯','🥳','😇','🤗','🫡'] },
  { label: 'Gestos', emojis: ['👍','👎','👌','✌️','🤞','🤙','👋','🖐️','🙌','👏','🤝','💪','🙏','☝️','👆','👇','👈','👉','🫶','✊'] },
  { label: 'Coracoes', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','♥️','🩷','🩵'] },
  { label: 'Objetos', emojis: ['🎉','🎊','🎁','🏆','⭐','🌟','💡','📌','📎','✏️','📝','📊','📈','💰','💼','🔑','🔔','📱','💻','⏰'] },
  { label: 'Simbolos', emojis: ['✅','❌','⚠️','🚫','💯','‼️','❓','❗','🔥','💥','✨','🎯','🆗','🆕','🔴','🟢','🟡','⬆️','⬇️','➡️'] },
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
          <button onClick={() => onSetRespostaParaMsg(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-0.5 rounded hover:bg-slate-200/50 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      {gravando ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onCancelarGravacao}
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
            onClick={onPararGravacao}
            className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0 shadow-sm shadow-red-500/25"
            title="Enviar audio"
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
              onClick={() => onSetEmojiAberto(prev => !prev)}
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
                            onClick={() => onInserirEmoji(e)}
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
              if (f) { onEnviarArquivo(f); e.target.value = ''; }
            }}
          />
          <input
            type="text"
            value={texto}
            onChange={e => onHandleTextoChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnviarMensagem(); } }}
            onFocus={() => onSetEmojiAberto(false)}
            placeholder={dmAtivo ? `Mensagem para ${dmAtivo.nome}...` : 'Mensagem no # geral...'}
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {texto.trim() ? (
            <button
              onClick={onEnviarMensagem}
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
              onClick={onIniciarGravacao}
              disabled={enviandoArquivo}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40 transition-all active:scale-95"
              title="Gravar audio"
            >
              <Mic size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
