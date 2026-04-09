import React from 'react';
import { CheckCheck, CornerUpLeft, ExternalLink, MessageCircle, Paperclip, Phone, Search, Smile, Trash2, Video, X } from 'lucide-react';
import type { Membro, Mensagem, ReacaoAgregada } from './chatTypes';

const CALL_WINDOW_NAME = 'biasi-hub-call';
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏'];

const URL_REGEX = /https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"]/g;

export interface ChatMessagesListProps {
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
  formatDateSeparator: (dateStr: string) => string;
  shouldShowDateSeparator: (msgs: Mensagem[], idx: number) => boolean;
  isConsecutive: (msgs: Mensagem[], idx: number) => boolean;
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
          {matches[i].length > 40 ? `${matches[i].slice(0, 40)}...` : matches[i]}
          <ExternalLink size={10} className="inline flex-shrink-0" />
        </a>,
      );
    }
  });

  return <>{elements}</>;
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
  return (
    <>
      {buscaMsgAberta && (
        <div className="px-3 pt-2 pb-1 bg-white border-b border-slate-100 flex items-center gap-2">
          <Search size={13} className="text-slate-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={buscaMensagem}
            onChange={(e) => onSetBuscaMensagem(e.target.value)}
            placeholder="Buscar nas mensagens..."
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
          />
          {buscaMensagem && (
            <span className="text-[10px] text-slate-400 flex-shrink-0">
              {mensagensFiltradas.length} resultado{mensagensFiltradas.length !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => { onSetBuscaMsgAberta(false); onSetBuscaMensagem(''); }} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X size={13} />
          </button>
        </div>
      )}

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
            const isMine = msg.remetente_id === usuarioId;
            const consecutive = isConsecutive(mensagensFiltradas, idx);
            const showDate = shouldShowDateSeparator(mensagensFiltradas, idx);
            const isDeleted = msg.tipo === 'deletado';
            const msgReacoes = reacoesPorMsg[msg.id] || [];

            return (
              <div key={msg.id}>
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
                      <div className={`px-3.5 py-2 text-[13px] leading-relaxed rounded-2xl border border-dashed ${isMine ? 'bg-slate-100 border-slate-300 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <span className="italic flex items-center gap-1.5">
                          <Trash2 size={11} className="opacity-50" />
                          Mensagem apagada
                        </span>
                      </div>
                    ) : (
                      <div className={`px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${isMine ? `bg-gradient-to-br from-blue-600 to-blue-700 text-white ${consecutive ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-br-md'}` : `bg-white text-slate-800 border border-slate-100 ${consecutive ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-bl-md'}`}`}>
                        {msg.resposta_conteudo && (
                          <div className={`text-[10px] mb-2 px-2.5 py-1.5 rounded-lg border-l-2 ${isMine ? 'bg-blue-500/30 border-blue-300 text-blue-100' : 'bg-slate-50 border-slate-300 text-slate-500'}`}>
                            <p className="font-bold truncate">{msg.resposta_remetente_nome}</p>
                            <p className="truncate opacity-80">{msg.resposta_conteudo}</p>
                          </div>
                        )}

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
                                target={CALL_WINDOW_NAME}
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isMine ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}`}
                              >
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                {msg.conteudo?.includes('video') || msg.conteudo?.includes('videochamada') ? <Video size={12} /> : <Phone size={12} />}
                                Entrar na chamada
                              </a>
                            ) : msg.arquivo_tipo === 'link/call-ended'
                            ? (
                              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${isMine ? 'bg-white/10 text-white/60' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                {msg.conteudo?.includes('video') || msg.conteudo?.includes('videochamada') ? <Video size={12} /> : <Phone size={12} />}
                                {msg.arquivo_nome || 'Chamada encerrada'}
                              </div>
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

                        {msg.conteudo && renderConteudoComLinks(msg.conteudo, isMine)}
                      </div>
                    )}

                    {msgReacoes.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {msgReacoes.map((r) => {
                          const jaReagi = r.userIds.includes(usuarioId ?? '');
                          return (
                            <button
                              key={r.emoji}
                              onClick={() => onToggleReacao(msg.id, r.emoji)}
                              title={r.usuarios.join(', ')}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all hover:scale-105 ${jaReagi ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                              <span>{r.emoji}</span>
                              <span className="text-[10px] font-medium">{r.userIds.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!isDeleted && (
                      <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'justify-end mr-1' : 'ml-1'}`}>
                        <div className="relative">
                          <button
                            onClick={() => onSetReacaoPickerAberto(reacaoPickerAberto === msg.id ? null : msg.id)}
                            className="p-0.5 text-slate-300 hover:text-amber-500 transition-colors"
                            title="Reagir"
                          >
                            <Smile size={10} />
                          </button>
                          {reacaoPickerAberto === msg.id && (
                            <div className={`absolute ${isMine ? 'right-0' : 'left-0'} bottom-full mb-1 flex items-center gap-0.5 bg-white border border-slate-200 rounded-full shadow-lg px-1.5 py-1 z-50`}>
                              {QUICK_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => onToggleReacao(msg.id, emoji)}
                                  className="w-6 h-6 flex items-center justify-center text-sm hover:bg-slate-100 rounded-full transition-colors active:scale-90"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => onSetRespostaParaMsg(msg)}
                          className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
                          title="Responder"
                        >
                          <CornerUpLeft size={10} />
                        </button>

                        {isMine && (
                          <button
                            onClick={() => { if (confirm('Apagar esta mensagem?')) onDeletarMensagem(msg.id); }}
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
    </>
  );
}
