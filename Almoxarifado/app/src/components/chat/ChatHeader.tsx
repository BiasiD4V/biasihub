import { X, Hash, ArrowLeft, Phone, Video, Search, MessageCircle } from 'lucide-react';
import type { Membro } from './chatTypes';

export interface ChatHeaderProps {
  mostrarLista: boolean;
  dmAtivo: Membro | null;
  quemDigitando: string | null;
  onlineCount: number;
  buscaMsgAberta: boolean;
  onVoltarParaLista: () => void;
  onFechar: () => void;
  onToggleBusca: () => void;
  onIniciarLigacao: () => void;
  onIniciarVideoCall: () => void;
  getAvatarColor: (name: string) => string;
  formatTempoOnline: (conectadoDesde: string | null) => string;
  formatUltimoVisto: (ultimoVisto: string | null) => string;
}

export function ChatHeader({
  mostrarLista,
  dmAtivo,
  quemDigitando,
  onlineCount,
  buscaMsgAberta,
  onVoltarParaLista,
  onFechar,
  onToggleBusca,
  onIniciarLigacao,
  onIniciarVideoCall,
  getAvatarColor,
  formatTempoOnline,
  formatUltimoVisto,
}: ChatHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        {!mostrarLista && (
          <button onClick={onVoltarParaLista} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors mr-0.5">
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
            <button onClick={onToggleBusca} className={`p-2 rounded-lg transition-colors ${buscaMsgAberta ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`} title="Buscar mensagens">
              <Search size={14} />
            </button>
            <button onClick={onIniciarLigacao} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Chamada de voz">
              <Phone size={14} />
            </button>
            <button onClick={onIniciarVideoCall} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Videochamada">
              <Video size={14} />
            </button>
          </>
        )}
        <button onClick={onFechar} className="p-2 rounded-lg hover:bg-white/10 transition-colors ml-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
