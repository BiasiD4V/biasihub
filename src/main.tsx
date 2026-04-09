import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/index.css';

const rootElement = document.getElementById('root');
const PWA_RESET_FLAG = 'biasi-hub-pwa-reset-v1';

async function resetLegacyPwaState(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return false;

  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  }

  if (!sessionStorage.getItem(PWA_RESET_FLAG)) {
    sessionStorage.setItem(PWA_RESET_FLAG, '1');
    window.location.reload();
    return true;
  }

  sessionStorage.removeItem(PWA_RESET_FLAG);
  return false;
}

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
      Carregando aplicação...
    </div>
  );

  resetLegacyPwaState()
    .catch((error) => {
      console.warn('Falha ao limpar cache antigo do app:', error);
      return false;
    })
    .then((reloadedForCleanup) => {
      if (reloadedForCleanup) return;

      import('./App')
        .then(({ App }) => {
          root.render(
            <React.StrictMode>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </React.StrictMode>
          );
        })
        .catch((error) => {
          console.error('Falha ao inicializar aplicação:', error);
          root.render(
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
              <div className="max-w-xl w-full bg-white border border-red-200 rounded-xl shadow-sm p-6 text-center">
                <h1 className="text-lg font-semibold text-red-700">Erro ao iniciar o sistema</h1>
                <p className="text-sm text-slate-600 mt-2">
                  Ocorreu um erro durante o carregamento inicial.
                </p>
                <p className="text-xs text-slate-500 mt-3 break-words">
                  {error instanceof Error ? error.message : String(error)}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Atualizar
                </button>
              </div>
            </div>
          );
        });
    });
}
