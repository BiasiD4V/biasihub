import type { ElementType } from 'react';
import { ExternalLink, Lock } from 'lucide-react';

interface ModuleCardProps {
  titulo: string;
  descricao: string;
  icone: ElementType;
  cor: string;
  corBg: string;
  disponivel: boolean;
  bloqueado?: boolean;
  badge?: string;
  onClick?: () => void;
}

export function ModuleCard({ titulo, descricao, icone: Icon, cor, corBg, disponivel, bloqueado, badge, onClick }: ModuleCardProps) {
  const clicavel = disponivel && !bloqueado && !!onClick;

  return (
    <div
      onClick={clicavel ? onClick : undefined}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 transition-all relative ${
        clicavel
          ? 'cursor-pointer hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5'
          : 'opacity-60 cursor-default'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${corBg} flex items-center justify-center`}>
          <Icon size={24} className={cor} />
        </div>
        {bloqueado ? (
          <Lock size={16} className="text-slate-400" />
        ) : disponivel ? (
          <ExternalLink size={16} className="text-slate-400" />
        ) : (
          <Lock size={16} className="text-slate-400" />
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-semibold text-slate-800">{titulo}</h3>
          {badge && !bloqueado && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {badge}
            </span>
          )}
          {bloqueado && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              Sem acesso
            </span>
          )}
          {!disponivel && !bloqueado && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              Em breve
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{descricao}</p>
      </div>
    </div>
  );
}
