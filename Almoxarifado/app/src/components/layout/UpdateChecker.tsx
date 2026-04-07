import { useEffect, useState } from 'react';
import { Rocket, RefreshCw } from 'lucide-react';

declare const __BUILD_VERSION__: string;

const CHECK_INTERVAL = 2 * 60 * 1000; // Check every 2 minutes

export function UpdateChecker() {
  const [desatualizado, setDesatualizado] = useState(false);

  useEffect(() => {
    const currentVersion = __BUILD_VERSION__;

    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.v && data.v !== currentVersion) {
          setDesatualizado(true);
        }
      } catch {
        // Network error, ignore
      }
    }

    // First check after 30s, then every 2min
    const initialTimeout = setTimeout(checkVersion, 30000);
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  async function atualizarAplicacao() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }
    } catch {
      // Ignore and continue with reload.
    }

    window.location.reload();
  }

  if (!desatualizado) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
        style={{ animation: 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-8 pt-8 pb-6 text-center text-white">
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative bg-white/20 backdrop-blur rounded-full w-20 h-20 flex items-center justify-center">
              <Rocket size={36} className="text-white" style={{ transform: 'rotate(-45deg)' }} />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Nova versão disponível!</h2>
          <p className="text-blue-100 text-sm mt-1.5">A equipe de desenvolvimento da BIASI não para</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 text-center">
          <p className="text-slate-600 text-sm leading-relaxed">
            Enquanto você trabalhava, soltamos <strong>atualizações novas</strong> no sistema.
            Seu navegador ainda está com a versão antiga em cache.
          </p>

          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-amber-800 text-xs font-medium">
              💡 Atualize para ter acesso às últimas funcionalidades e correções
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8">
          <button
            onClick={atualizarAplicacao}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98]"
          >
            <RefreshCw size={18} />
            Atualizar Agora
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-3">
            Ou pressione <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[9px]">F5</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[9px]">Ctrl+R</kbd>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
