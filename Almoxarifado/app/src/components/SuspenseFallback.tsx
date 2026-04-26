import { useEffect, useState } from 'react';

/**
 * Fallback do Suspense raiz. Mostra apenas um spinner nos primeiros
 * segundos. Depois de 8s exibe um aviso de "Demorando?" com botão
 * de recarregar — assim o usuário nunca fica num spinner sem saída.
 */
export function SuspenseFallback() {
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDemorou(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
        {demorou && (
          <div className="max-w-xs space-y-3">
            <p className="text-sm text-slate-300">
              Está demorando mais que o normal. Pode ser instabilidade da rede.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-[#FFC82D]/40 bg-[#FFC82D]/12 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#FFC82D] hover:bg-[#FFC82D] hover:text-slate-900 transition"
            >
              Recarregar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
