import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** "page" = full-page centered, "inline" = small inline spinner */
  variant?: 'page' | 'inline';
  texto?: string;
}

export function LoadingSpinner({ variant = 'page', texto }: LoadingSpinnerProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <Loader2 size={16} className="animate-spin text-blue-500" />
        {texto && <span className="text-xs text-slate-500">{texto}</span>}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <span className="text-sm text-slate-500">{texto ?? 'Carregando...'}</span>
      </div>
    </div>
  );
}
