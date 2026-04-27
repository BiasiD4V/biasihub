import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'

const App = lazy(() => import('./App'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Carregando Almoxarifado...</p>
        </div>
      </div>
    }>
      <App />
    </Suspense>
  </StrictMode>,
)

// PWA: registra service worker apenas pra equipe interna logada.
// Pula:
//   - Electron (app:// — Desktop usa electron-updater)
//   - Rotas públicas (/req, /fila, /rastreio, /obra) — pessoal de obra abre,
//     preenche, fecha. Não faz sentido oferecer "instalar Almox" pra eles.
const PWA_PUBLIC_ROUTES = ['/req', '/fila', '/rastreio', '/obra'];
const isPublicRoute =
  typeof window !== 'undefined' &&
  PWA_PUBLIC_ROUTES.some((r) => window.location.pathname.startsWith(r));

if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
  if (isPublicRoute) {
    // Em rotas públicas, GARANTE que NÃO fica SW antigo intermediando.
    // Quem visitou /req quando o SW estava ativo (antes do split) ainda tem
    // o SW velho cacheando a versão antiga. Desregistra + limpa caches uma
    // vez, depois deixa o navegador buscar fresco do Vercel.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (regs.length === 0) return;
        Promise.all(regs.map((r) => r.unregister())).then(() => {
          if ('caches' in window) {
            caches.keys().then((keys) => {
              Promise.all(keys.map((k) => caches.delete(k))).then(() => {
                // Reload UMA vez (sessionStorage flag) pra pegar o bundle novo
                if (!sessionStorage.getItem('biasi_sw_purged_v1')) {
                  sessionStorage.setItem('biasi_sw_purged_v1', '1');
                  window.location.reload();
                }
              });
            });
          }
        });
      }).catch(() => {/* silencia */});
    }
  } else {
    // Equipe interna logada → registra SW pra ganhar PWA-like e cache offline
    import('virtual:pwa-register')
      .then(({ registerSW }) => registerSW({ immediate: true }))
      .catch(() => {/* dev sem PWA — silencia */});
  }
}
