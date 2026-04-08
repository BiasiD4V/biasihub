import { useEffect, useState } from 'react';
import { X, ArrowLeft, Sparkles } from 'lucide-react';

declare const __BUILD_VERSION__: string;

export function UpdateChecker() {
  const [versaoNova, setVersaoNova] = useState<string | null>(null);
  const [dispensado, setDispensado] = useState(false);

  const bridge = (window as any).electronBridge;
  const isDesktop = !!bridge;

  useEffect(() => {
    let cancelado = false;

    async function verificar() {
      // Modo Desktop: usa o bridge do Electron
      if (isDesktop) {
        try {
          const resultado = await bridge.checkForUpdates?.();
          if (!cancelado && resultado?.hasUpdate) {
            setVersaoNova(resultado.version ?? 'nova');
          }
        } catch {
          // ignora
        }
        return;
      }

      // Modo Web: verifica version.json
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok || cancelado) return;
        const data = await res.json();
        const current = __BUILD_VERSION__;
        if (data.v && data.v !== current) setVersaoNova(data.v);
      } catch {
        // ignora
      }
    }

    // Primeira verificação após 20s, depois a cada 5min
    const t = setTimeout(verificar, 20000);
    const iv = setInterval(verificar, 5 * 60 * 1000);
    return () => { cancelado = true; clearTimeout(t); clearInterval(iv); };
  }, []);

  if (!versaoNova || dispensado) return null;

  // Modo Desktop: banner simples redirecionando para o Hub
  if (isDesktop) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-indigo-600 text-white text-xs font-medium flex-shrink-0">
        <Sparkles size={13} className="flex-shrink-0 opacity-80" />
        <span className="flex-1">
          Nova versão <strong>v{versaoNova}</strong> disponível — volte ao Hub para atualizar.
        </span>
        <button
          onClick={() => { window.location.href = 'app://hub.local/'; }}
          className="flex items-center gap-1 px-2.5 py-1 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <ArrowLeft size={11} /> Ir para o Hub
        </button>
        <button onClick={() => setDispensado(true)} className="p-0.5 opacity-60 hover:opacity-100 transition-opacity">
          <X size={13} />
        </button>
      </div>
    );
  }

  // Modo Web: modal de atualização (recarregar página)
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <Sparkles size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">Atualização disponível</p>
          <p className="text-xs text-slate-500 mt-0.5">Recarregue para usar a versão mais recente.</p>
        </div>
        <button onClick={() => setDispensado(true)} className="text-slate-300 hover:text-slate-500">
          <X size={15} />
        </button>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Atualizar agora
      </button>
    </div>
  );
}
