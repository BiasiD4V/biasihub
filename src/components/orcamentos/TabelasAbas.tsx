import { useState } from 'react';
import type { ReactNode } from 'react';

interface TabelasAbsProps {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabelasProps {
  abas: TabelasAbsProps[];
  abaInicial?: string;
}

export function TabelasAbas({ abas, abaInicial }: TabelasProps) {
  const [abaAtiva, setAbaAtiva] = useState(abaInicial || abas[0]?.id);

  const abaContent = abas.find((a: TabelasAbsProps) => a.id === abaAtiva);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full flex flex-col">
      {/* Abas */}
      <div className="flex gap-1 border-b border-slate-200 mb-4 -mx-5 -mt-5 px-5 pt-5 pb-4">
        {abas.map((aba: TabelasAbsProps) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-4 ${
              abaAtiva === aba.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {aba.icon}
            {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {abaContent && (
        <div className="flex-1 min-h-0">
          {abaContent.content}
        </div>
      )}
    </div>
  );
}
