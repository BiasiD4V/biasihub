import React from 'react';
import { 
  Search, X, MessageCircle, Trash2, ExternalLink, Video, 
  Phone, Paperclip, CornerUpLeft, Smile, CheckCheck 
} from 'lucide-react';
import type { Mensagem, ReacaoAgregada, Membro } from './chatTypes';

const QUICK_REACTIONS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F525}',
];
const CALL_WINDOW_NAME = 'biasi-hub-call';

interface ChatMessagesListProps {
  mensagens: Mensagem[];
  mensagensFiltradas: Mensagem[];
  reacoesPorMsg: Record<string, ReacaoAgregada[]>;
  carregando: boolean;
  quemDigitando: string | null;
  dmAtivo: Membro | null;
  usuarioId: string | undefined;
  ultimaMinhaMensagemId: string | undefined;
  buscaMsgAberta: boolean;
  buscaMensagem: string;
  reacaoPickerAberto: string | null;
  scrollRef: React.RefObject<HTMLDivElement>;
  onSetBuscaMensagem: (val: string) => void;
  onSetBuscaMsgAberta: (val: boolean) => void;
  onSetRespostaParaMsg: (msg: Mensagem) => void;
  onSetReacaoPickerAberto: (val: string | null) => void;
  onToggleReacao: (msgId: string, emoji: string) => void;
  onDeletarMensagem: (msgId: string) => void;
  getAvatarColor: (name: string) => string;
  formatDateSeparator: (date: string) => string;
  shouldShowDateSeparator: (msgs: Mensagem[], idx: number) => boolean;
  isConsecutive: (msgs: Mensagem[], idx: number) => boolean;
}

export function ChatMessagesList({
  mensagens,
  mensagensFiltradas,
  reacoesPorMsg,
  carregando,
  quemDigitando,
  dmAtivo,
  usuarioId,
  ultimaMinhaMensagemId,
  buscaMsgAberta,
  buscaMensagem,
  reacaoPickerAberto,
  scrollRef,
  onSetBuscaMensagem,
  onSetBuscaMsgAberta,
  onSetRespostaParaMsg,
  onSetReacaoPickerAberto,
  onToggleReacao,
  onDeletarMensagem,
  getAvatarColor,
  formatDateSeparator,
  shouldShowDateSeparator,
  isConsecutive,
}: ChatMessagesListProps) {

  const renderConteudoComLinks = (conteudo: string, isMine: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = conteudo.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all ${isMine ? 'text-sky-300 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'}`}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <>
      {buscaMsgAberta && (
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <Search size={16} className="text-slate-300 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={buscaMensagem}
            onChange={(e) => onSetBuscaMensagem(e.target.value)}
            placeholder="Rastrear Dados..."
            className="flex-1 text-xs font-black text-slate-100 bg-transparent focus:outline-none placeholder:text-slate-400 placeholder:uppercase placeholder:tracking-widest"
          />
          <button onClick={() => { onSetBuscaMsgAberta(false); onSetBuscaMensagem(''); }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-700 text-slate-300 transition-all">
            <X size={16} />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar bg-transparent">
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="relative">
                <div className="w-12 h-12 border-4 border-slate-900/5 rounded-2xl animate-spin border-t-indigo-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                </div>
             </div>
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Sincronizando Rede...</p>
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-90">
            <div className="w-20 h-20 rounded-[32px] bg-slate-900/5 flex items-center justify-center text-slate-300">
              <MessageCircle size={40} />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2 text-center">Protocolo Silencioso</p>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">Nenhuma transmissao detectada ainda.</p>
            </div>
          </div>
        ) : (
          mensagensFiltradas.map((msg, idx) => {
            const isMine = msg.remetente_id === usuarioId;
            const consecutive = isConsecutive(mensagensFiltradas, idx);
            const showDate = shouldShowDateSeparator(mensagensFiltradas, idx);
            const isDeleted = msg.tipo === 'deletado';
            const msgReacoes = reacoesPorMsg[msg.id] || [];

            return (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {showDate && (
                  <div className="flex items-center gap-4 py-6">
                    <div className="flex-1 h-px bg-slate-700/70" />
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] bg-transparent">
                      {formatDateSeparator(msg.criado_em)}
                    </span>
                    <div className="flex-1 h-px bg-slate-700/70" />
                  </div>
                )}

                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group items-end gap-3`}>
                  {!isMine && !consecutive && (
                    <div className={`bg-gradient-to-br ${getAvatarColor(msg.remetente_nome)} rounded-2xl w-10 h-10 flex items-center justify-center flex-shrink-0 shadow-lg mb-1 group-hover:scale-105 transition-transform`}>
                      <span className="text-white text-xs font-black">{msg.remetente_nome.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  {!isMine && consecutive && <div className="w-10 flex-shrink-0" />}

                  <div className={`max-w-[85%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && !consecutive && (
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 ml-1">{msg.remetente_nome}</p>
                    )}

                    <div className="relative group/bubble max-w-full">
                      {isDeleted ? (
                        <div className="px-5 py-3 rounded-[24px] bg-slate-800 border border-dashed border-slate-600 text-slate-300 text-[11px] font-black uppercase tracking-widest italic flex items-center gap-2">
                           <Trash2 size={12} className="opacity-40" />
                           Mensagem Deletada
                        </div>
                      ) : (
                        <div className={`px-5 py-4 min-w-[60px] relative overflow-hidden transition-all duration-300 ${
                          isMine 
                            ? `bg-slate-900 text-white rounded-[28px] rounded-br-[8px] shadow-xl shadow-slate-900/20` 
                            : `bg-slate-800 text-slate-100 border border-slate-700 rounded-[28px] rounded-bl-[8px] shadow-lg shadow-black/20`
                        }`}>
                          {/* Gloss Effect for mine */}
                          {isMine && <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />}

                          {msg.resposta_conteudo && (
                            <div className={`text-[10px] font-black uppercase tracking-widest mb-3 px-3 py-2 rounded-xl border-l-4 ${isMine ? 'bg-white/5 border-white/20 text-white/60' : 'bg-slate-900 border-indigo-400/60 text-slate-300'}`}>
                              <p className="mb-0.5 truncate">{msg.resposta_remetente_nome}</p>
                              <p className="truncate opacity-50 line-clamp-1">{msg.resposta_conteudo}</p>
                            </div>
                          )}

                          {msg.arquivo_url && (
                             <div className="mb-2 max-w-full overflow-hidden">
                                {msg.arquivo_tipo?.startsWith('image/') ? (
                                  <div className="relative group/img overflow-hidden rounded-2xl bg-black/5">
                                    <img
                                      src={msg.arquivo_url}
                                      alt={msg.arquivo_nome ?? 'Midia'}
                                      className="max-w-full rounded-2xl object-cover cursor-pointer hover:scale-105 transition-transform duration-500 max-h-[300px]"
                                      onClick={() => window.open(msg.arquivo_url!, '_blank')}
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                       <ExternalLink size={24} className="text-white drop-shadow-lg" />
                                    </div>
                                  </div>
                                ) : msg.arquivo_tipo?.startsWith('audio/') ? (
                                  <div className={`p-2 rounded-2xl ${isMine ? 'bg-white/10' : 'bg-slate-700/70'}`}>
                                    <audio src={msg.arquivo_url} controls className="h-10 w-full max-w-[240px]" />
                                  </div>
                                ) : msg.arquivo_tipo === 'link/call' ? (
                                  <a href={msg.arquivo_url!} target={CALL_WINDOW_NAME} className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${isMine ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                                     <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                     {msg.conteudo?.includes('video') ? <Video size={14} /> : <Phone size={14} />}
                                     Ingressar na Sala
                                  </a>
                                ) : (
                                  <a href={msg.arquivo_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-2xl border ${isMine ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-slate-700 border-slate-600 text-indigo-300 hover:bg-slate-600 transition-all'}`}>
                                     <Paperclip size={14} />
                                     <span className="text-[10px] font-black uppercase tracking-widest truncate">{msg.arquivo_nome}</span>
                                  </a>
                                )}
                             </div>
                          )}

                          {msg.conteudo && (
                            <div className={`text-sm tracking-tight leading-relaxed font-black ${isMine ? 'text-white/95' : 'text-slate-100'}`}>
                              {renderConteudoComLinks(msg.conteudo, isMine)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions Over Bubble */}
                      {!isDeleted && (
                         <div className={`absolute top-0 ${isMine ? '-left-12' : '-right-12'} opacity-0 group-hover/bubble:opacity-100 transition-all duration-300 flex flex-col gap-1 items-center py-1 scale-95 group-hover/bubble:scale-100`}>
                            <button onClick={() => onSetRespostaParaMsg(msg)} className="w-8 h-8 rounded-xl bg-slate-800 shadow-lg border border-slate-600 flex items-center justify-center text-slate-300 hover:text-indigo-300 hover:scale-110 transition-all">
                               <CornerUpLeft size={14} />
                            </button>
                            <button onClick={() => onSetReacaoPickerAberto(reacaoPickerAberto === msg.id ? null : msg.id)} className="w-8 h-8 rounded-xl bg-slate-800 shadow-lg border border-slate-600 flex items-center justify-center text-slate-300 hover:text-amber-300 hover:scale-110 transition-all">
                               <Smile size={14} />
                            </button>
                            {isMine && (
                               <button onClick={() => { if (confirm('Purgar esta transmissao?')) onDeletarMensagem(msg.id); }} className="w-8 h-8 rounded-xl bg-slate-800 shadow-lg border border-slate-600 flex items-center justify-center text-slate-300 hover:text-rose-300 hover:scale-110 transition-all">
                                  <Trash2 size={14} />
                               </button>
                            )}
                         </div>
                      )}
                    </div>

                    {/* Reactions - High Tech */}
                    {msgReacoes.length > 0 && (
                      <div className={`flex flex-wrap gap-1.5 mt-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {msgReacoes.map((r) => {
                          const jaReagi = r.userIds.includes(usuarioId ?? '');
                          return (
                            <button
                              key={r.emoji}
                              onClick={() => onToggleReacao(msg.id, r.emoji)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-black border-2 transition-all hover:scale-105 ${jaReagi ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}`}
                            >
                              <span>{r.emoji}</span>
                              <span className="opacity-70">{r.userIds.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className={`flex items-center gap-2 mt-1.5 ${isMine ? 'justify-end mr-2' : 'ml-2'}`}>
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest opacity-90">
                         {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                       </p>
                       {isMine && dmAtivo && msg.id === ultimaMinhaMensagemId && msg.lido && (
                         <div className="flex items-center gap-1">
                            <CheckCheck size={12} className="text-indigo-600" />
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Transmitido</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                {/* Reaction Picker Modal */}
                {reacaoPickerAberto === msg.id && (
                  <div className={`flex justify-center my-3 animate-in zoom-in-95 duration-200`}>
                     <div className="bg-slate-800 border border-slate-600 rounded-[32px] p-2 flex items-center gap-2 shadow-2xl">
                        {QUICK_REACTIONS.map((emoji) => (
                           <button
                             key={emoji}
                             onClick={() => onToggleReacao(msg.id, emoji)}
                             className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-700 rounded-2xl transition-all active:scale-90"
                           >
                              {emoji}
                           </button>
                        ))}
                     </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {quemDigitando && (
          <div className="flex items-center gap-4 px-1 py-4 mt-4 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-slate-800 border border-slate-600 rounded-[28px] rounded-bl-[8px] px-5 py-3 shadow-lg flex items-center gap-3">
               <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">{quemDigitando}</span>
               <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
               </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

