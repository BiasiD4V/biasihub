import { useState, useRef, useEffect } from 'react';
import { Bell, Package, ClipboardList, HardHat, Wrench, CheckCheck, X, LucideIcon } from 'lucide-react';
import { useNotificacoes, Notificacao } from '../hooks/useNotificacoes';

const ICONES: Record<Notificacao['tipo'], LucideIcon> = {
  estoque_baixo: Package,
  requisicao_pendente: ClipboardList,
  epi_vencendo: HardHat,
  manutencao_vencida: Wrench,
};

const CORES: Record<Notificacao['tipo'], string> = {
  estoque_baixo: 'text-amber-500 bg-amber-50',
  requisicao_pendente: 'text-blue-500 bg-blue-50',
  epi_vencendo: 'text-rose-500 bg-rose-50',
  manutencao_vencida: 'text-orange-500 bg-orange-50',
};

function tempoAtras(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export function NotificacoesDropdown() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Notificações"
      >
        <Bell size={18} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">
              Notificações {naoLidas > 0 && <span className="text-rose-500">({naoLidas})</span>}
            </p>
            <div className="flex gap-1">
              {naoLidas > 0 && (
                <button
                  onClick={marcarTodasLidas}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={15} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notificacoes.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sem notificações</p>
              </div>
            ) : (
              notificacoes.map(n => {
                const Icon = ICONES[n.tipo];
                const cor = CORES[n.tipo];
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.lida && marcarLida(n.id)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                      n.lida ? 'opacity-60' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cor}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${n.lida ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                        {n.mensagem}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{tempoAtras(n.criado_em)}</p>
                    </div>
                    {!n.lida && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
