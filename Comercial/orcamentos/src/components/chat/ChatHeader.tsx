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
    <div className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        {!mostrarLista && (
          <button onClick={onVoltarParaLista} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 transition-all active:scale-90">
            <ArrowLeft size={16} />
          </button>
        )}

        {mostrarLista ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-sky-300 shadow-xl shadow-black/25">
              <MessageCircle size={20} />
            </div>
            <div>
              <span className="font-black text-slate-100 text-sm block leading-none mb-1 tracking-tight">Comunicacoes</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{onlineCount} Operacionais</span>
              </div>
            </div>
          </div>
        ) : dmAtivo ? (
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className={`bg-gradient-to-br ${getAvatarColor(dmAtivo.nome)} rounded-2xl w-10 h-10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                <span className="text-white text-sm font-black">{dmAtivo.nome.charAt(0).toUpperCase()}</span>
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${dmAtivo.esta_online ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </div>
            <div>
              <span className="font-black text-slate-100 text-sm block leading-none mb-1 tracking-tight">{dmAtivo.nome}</span>
              {quemDigitando ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-indigo-300 font-black uppercase tracking-widest animate-pulse">Transmitindo...</span>
                </div>
              ) : (
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {dmAtivo.esta_online ? formatTempoOnline(dmAtivo.conectado_desde) : formatUltimoVisto(dmAtivo.ultimo_visto)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-sky-300 shadow-xl shadow-black/25">
              <Hash size={20} />
            </div>
            <div>
              <span className="font-black text-slate-100 text-sm block leading-none mb-1 tracking-tight">Canal Geral</span>
              {quemDigitando ? (
                <span className="text-[10px] text-indigo-300 font-black uppercase tracking-widest animate-pulse">
                  {quemDigitando} digitando...
                </span>
              ) : (
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Protocolo de Equipe</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!mostrarLista && (
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-2xl border border-slate-700">
            <button onClick={onToggleBusca} className={`p-2 rounded-xl transition-all ${buscaMsgAberta ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}`} title="Buscar">
              <Search size={16} />
            </button>
            <button onClick={onIniciarLigacao} className="p-2 rounded-xl text-slate-300 hover:text-indigo-300 hover:bg-slate-700 transition-all" title="Voz">
              <Phone size={16} />
            </button>
            <button onClick={onIniciarVideoCall} className="p-2 rounded-xl text-slate-300 hover:text-purple-300 hover:bg-slate-700 transition-all" title="Video">
              <Video size={16} />
            </button>
          </div>
        )}

        <button onClick={onFechar} className="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-90">
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
