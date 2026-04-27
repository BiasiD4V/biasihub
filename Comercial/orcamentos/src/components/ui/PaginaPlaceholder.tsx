import { type LucideIcon } from 'lucide-react';

interface PaginaPlaceholderProps {
  titulo: string;
  subtitulo: string;
  icone: LucideIcon;
  descricao?: string;
}

export function PaginaPlaceholder({
  titulo,
  subtitulo,
  icone: Icone,
  descricao,
}: PaginaPlaceholderProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitulo}</p>
      </div>

      {/* Área principal */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 rounded-2xl p-6">
              <Icone size={40} className="text-slate-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">{titulo}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {descricao ?? 'Módulo em construção. Funcionalidades disponíveis em breve.'}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Em desenvolvimento
          </div>
        </div>
      </div>
    </div>
  );
}
