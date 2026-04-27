import { SearchX, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  mensagem: string;
  descricao?: string;
  icone?: LucideIcon;
}

export function EmptyState({ mensagem, descricao, icone: Icone = SearchX }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icone size={36} className="text-slate-300 mb-3" />
      <p className="text-slate-600 font-medium mb-1">{mensagem}</p>
      {descricao && <p className="text-xs text-slate-400">{descricao}</p>}
    </div>
  );
}
