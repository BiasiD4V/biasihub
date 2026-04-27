import { Search, Hash, Plus } from 'lucide-react';
import type { Membro } from './chatTypes';
import { getAvatarColor, formatUltimoVisto } from './chatTypes';

export interface Canal {
  id: string;
  nome: string;
  tipo: 'geral' | 'setor' | 'grupo';
  descricao: string | null;
  icone: string | null;
}

export interface ChatContactsListProps {
  membros: Membro[];
  canais: Canal[];
  buscaMembro: string;
  geralNaoLidaCount: number;
  naoLidasPorConta: Record<string, number>;
  naoLidasPorCanal: Record<string, number>;
  onBuscaMembro: (val: string) => void;
  onAbrirCanal: (canal: Canal) => void;
  onAbrirDM: (membro: Membro) => void;
  onCriarGrupo: () => void;
}

export function ChatContactsList({
  membros,
  canais,
  buscaMembro,
  geralNaoLidaCount,
  naoLidasPorConta,
  naoLidasPorCanal,
  onBuscaMembro,
  onAbrirCanal,
  onAbrirDM,
  onCriarGrupo,
}: ChatContactsListProps) {
  const membrosFiltrados = buscaMembro
    ? membros.filter((m) => m.nome.toLowerCase().includes(buscaMembro.toLowerCase()))
    : membros;

  const canalGeral = canais.find((c) => c.tipo === 'geral');
  const canaisSetor = canais.filter((c) => c.tipo === 'setor');
  const canaisGrupo = canais.filter((c) => c.tipo === 'grupo');

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar space-y-6 bg-slate-900">
      <div className="sticky top-0 z-10 pt-2 pb-4 bg-slate-900 -mx-4 px-4 mb-2">
        <div className="relative group">
          <input
            type="text"
            value={buscaMembro}
            onChange={(e) => onBuscaMembro(e.target.value)}
            placeholder="Protocolo de busca..."
            className="w-full h-12 pl-12 pr-5 text-xs font-black text-slate-100 bg-slate-800 border-2 border-slate-700 rounded-2xl focus:border-indigo-400 focus:outline-none transition-all placeholder:text-slate-400 placeholder:uppercase placeholder:tracking-widest"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-300 transition-colors" />
        </div>
      </div>

      {canalGeral && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            Canal Mestre
          </p>
          <button
            onClick={() => onAbrirCanal(canalGeral)}
            className="w-full bg-slate-800 border border-slate-700 p-5 rounded-[28px] hover:bg-slate-700 transition-all text-left flex items-center gap-4 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
              <Hash size={20} className="text-sky-300" />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <span className="font-black text-slate-100 text-sm block leading-tight mb-0.5">Frequencia Geral</span>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest truncate">Comunicacoes Abertas</p>
            </div>
            {geralNaoLidaCount > 0 && (
              <div className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[9px] font-black shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                {geralNaoLidaCount > 99 ? '99+' : geralNaoLidaCount}
              </div>
            )}
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between ml-2">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            Grupos Taticos
          </p>
          <button onClick={onCriarGrupo} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all" title="Criar grupo">
            <Plus size={14} />
          </button>
        </div>
        {(canaisSetor.length > 0 || canaisGrupo.length > 0) ? (
          <div className="grid grid-cols-1 gap-2">
            {[...canaisSetor, ...canaisGrupo].map((c) => (
              <button
                key={c.id}
                onClick={() => onAbrirCanal(c)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 hover:border-indigo-400/40 hover:bg-slate-700 transition-all text-left flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-200 group-hover:bg-slate-900 transition-all text-lg shadow-sm">
                  {c.icone || <Hash size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-black text-slate-100 text-xs tracking-tight group-hover:text-indigo-300 transition-colors">{c.nome}</span>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mt-0.5">{c.tipo}</p>
                </div>
                {(naoLidasPorCanal[c.id] || 0) > 0 && (
                  <div className="px-2 py-0.5 rounded-lg bg-indigo-500 text-white text-[9px] font-black shadow-lg shadow-indigo-500/20">
                    {(naoLidasPorCanal[c.id] || 0) > 99 ? '99+' : (naoLidasPorCanal[c.id] || 0)}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-500 italic ml-2">Nenhum grupo ainda. Clique em + para criar.</p>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-slate-400" />
          Operacionais
        </p>

        <div className="space-y-2 pb-6">
          {membrosFiltrados.map((m) => (
            <button
              key={m.id}
              onClick={() => onAbrirDM(m)}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-[28px] bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-700 transition-all text-left group relative"
            >
              <div className="relative flex-shrink-0">
                <div className={`bg-gradient-to-br ${getAvatarColor(m.nome)} rounded-2xl w-12 h-12 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                  <span className="text-white text-sm font-black">{m.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${m.esta_online ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-500'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-black text-slate-100 text-sm tracking-tight truncate group-hover:text-indigo-300 transition-colors">{m.nome}</p>
                  {(naoLidasPorConta[m.id] || 0) > 0 && (
                    <div className="px-2 py-0.5 rounded-lg bg-indigo-500 text-white text-[9px] font-black uppercase shadow-lg shadow-indigo-500/20">
                      {(naoLidasPorConta[m.id] || 0) > 99 ? '99+' : naoLidasPorConta[m.id]}
                    </div>
                  )}
                </div>
                <p className={`text-[9px] font-black uppercase tracking-widest ${m.esta_online ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {m.esta_online ? 'Conexao Ativa' : formatUltimoVisto(m.ultimo_visto)}
                </p>
              </div>
            </button>
          ))}

          {membrosFiltrados.length === 0 && (
            <div className="text-center py-12 px-6 rounded-[32px] bg-slate-800 border-2 border-dashed border-slate-700">
              <div className="w-12 h-12 rounded-2xl bg-slate-700 flex items-center justify-center text-slate-300 mx-auto mb-4">
                <Search size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                Nenhum sinal detectado na rede para "{buscaMembro}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
