import { AlertTriangle, XCircle, Info, type LucideIcon } from 'lucide-react';

type Variante = 'error' | 'warning' | 'info';

const CONFIG: Record<Variante, { bg: string; text: string; border: string; Icone: LucideIcon }> = {
  error:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   Icone: XCircle },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', Icone: AlertTriangle },
  info:    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  Icone: Info },
};

interface ErrorAlertProps {
  mensagem: string;
  variante?: Variante;
  onClose?: () => void;
}

export function ErrorAlert({ mensagem, variante = 'error', onClose }: ErrorAlertProps) {
  const { bg, text, border, Icone } = CONFIG[variante];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${bg} ${border}`}>
      <Icone size={16} className={`mt-0.5 flex-shrink-0 ${text}`} />
      <p className={`text-sm flex-1 ${text}`}>{mensagem}</p>
      {onClose && (
        <button onClick={onClose} className={`text-xs ${text} hover:opacity-70`}>✕</button>
      )}
    </div>
  );
}
