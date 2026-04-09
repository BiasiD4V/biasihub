import { useState } from 'react';
import { Search, Hash, Users, Plus, Building2 } from 'lucide-react';
import type { Membro } from './chatTypes';
import { getAvatarColor, formatTempoOnline, formatUltimoVisto } from './chatTypes';

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
  geralNaoLida: boolean;
  naoLidasPorConta: Set<string>;
  onBuscaMembro: (val: string) => void;
  onAbrirCanal: (canal: Canal) => void;
  onAbrirDM: (membro: Membro) => void;
  onCriarGrupo: () => void;
}

export function ChatContactsList({
  membros,
  canais,
  buscaMembro,
  geralNaoLida,
  naoLidasPorConta,
  onBuscaMembro,
  onAbrirCanal,
  onAbrirDM,
  onCriarGrupo,
}: ChatContactsListProps) {
  const membrosFiltrados = buscaMembro
    ? membros.filter(m => m.nome.toLowerCase().includes(buscaMembro.toLowerCase()))
    : membros;

  const canalGeral = canais.find(c => c.tipo === 'geral');
  const canaisSetor = canais.filter(c => c.tipo === 'setor');
  const canaisGrupo = canais.filter(c => c.tipo === 'grupo');

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search */}
      <div className="p-3 pb-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={buscaMembro}
            onChange={e => onBuscaMembro(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Canal Geral */}
      {canalGeral && (
        <div className="p-3 pb-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
            <Hash size={10} className="text-slate-300" />
            Canal Principal
          </p>
          <button
            onClick={() => onAbrirCanal(canalGeral)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all text-left group"
          >
            <div className="bg-slate-100 group-hover:bg-blue-100 rounded-lg p-2 transition-colors">
              <Hash size={14} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-700">Geral</span>
              <p className="text-[10px] text-slate-400 truncate">Canal aberto para toda a equipe</p>
            </div>
            {geralNaoLida && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 ml-2 animate-pulse shadow-sm shadow-blue-500/50" />
            )}
          </button>
        </div>
      )}

      {/* Canais de Setor */}
      {canaisSetor.length > 0 && (
        <div className="px-3 pb-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
            <Building2 size={10} className="text-slate-300" />
            Setores
          </p>
          <div className="space-y-0.5">
            {canaisSetor.map(c => (
              <button
                key={c.id}
                onClick={() => onAbrirCanal(c)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all text-left group"
              >
                <div className="bg-indigo-50 group-hover:bg-indigo-100 rounded-lg p-1.5 transition-colors text-base">
                  {c.icone || '👥'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700">{c.nome}</span>
                  {c.descricao && <p className="text-[10px] text-slate-400 truncate">{c.descricao}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grupos */}
      <div className="px-3 pb-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Users size={10} className="text-slate-300" />
            Grupos
          </p>
          <button
            onClick={onCriarGrupo}
            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Novo Grupo"
          >
            <Plus size={12} />
          </button>
        </div>
        {canaisGrupo.length > 0 ? (
          <div className="space-y-0.5">
            {canaisGrupo.map(c => (
              <button
                key={c.id}
                onClick={() => onAbrirCanal(c)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all text-left group"
              >
                <div className="bg-emerald-50 group-hover:bg-emerald-100 rounded-lg p-1.5 transition-colors text-base">
                  {c.icone || '💬'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700">{c.nome}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 px-3 py-1">Nenhum grupo criado</p>
        )}
      </div>

      {/* Direct Messages */}
      <div className="px-3 pb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1 flex items-center gap-1.5">
          <Users size={10} className="text-slate-300" />
          Mensagens Diretas
        </p>
        <div className="space-y-0.5">
          {membrosFiltrados.map(m => (
            <button
              key={m.id}
              onClick={() => onAbrirDM(m)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all text-left group"
            >
              <div className="relative flex-shrink-0">
                <div className={`bg-gradient-to-br ${getAvatarColor(m.nome)} rounded-full w-9 h-9 flex items-center justify-center shadow-sm`}>
                  <span className="text-white text-xs font-bold">{m.nome.charAt(0).toUpperCase()}</span>
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${m.esta_online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              </div>
              <div className="min-w-0 flex-1 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{m.nome}</p>
                  <p className={`text-[10px] ${m.esta_online ? 'text-emerald-500 font-medium' : 'text-slate-400'}`}>
                    {m.esta_online ? formatTempoOnline(m.conectado_desde) : formatUltimoVisto(m.ultimo_visto)}
                  </p>
                </div>
                {naoLidasPorConta.has(m.id) && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 ml-2 animate-pulse shadow-sm shadow-blue-500/50" />
                )}
              </div>
            </button>
          ))}
          {membrosFiltrados.length === 0 && membros.length > 0 && (
            <p className="text-xs text-slate-400 px-3 py-4 text-center">Nenhum resultado para &ldquo;{buscaMembro}&rdquo;</p>
          )}
          {membros.length === 0 && (
            <div className="text-center py-6 px-3">
              <Users size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">Nenhum membro disponível</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
