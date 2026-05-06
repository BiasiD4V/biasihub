import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase } from './infrastructure/supabase/client';
import { installConnectionRecovery, purgeMobileWebCaches } from './utils/runtime';
import './styles/index.css';
import './styles/aparencia.css';

void purgeMobileWebCaches();
installConnectionRecovery(supabase);

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
      Carregando aplicação...
    </div>
  );

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
}
