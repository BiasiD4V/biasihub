import type { LucideIcon } from 'lucide-react';

interface Props {
  titulo: string;
  valor: string | number;
  Icon: LucideIcon;
  corIcone?: string;
  corFundo?: string;
}

export function CardResumo({ titulo, valor, Icon, corIcone = 'text-blue-600', corFundo = 'bg-blue-50' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-lg ${corFundo} ${corIcone}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="text-2xl font-semibold text-gray-800">{valor}</p>
      </div>
    </div>
  );
}
