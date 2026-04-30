import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import { supabase } from './infrastructure/supabase/client'
import { installConnectionRecovery, purgeMobileWebCaches } from './utils/runtime'

const App = lazy(() => import('./App'))

void purgeMobileWebCaches()
installConnectionRecovery(supabase)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    }>
      <App />
    </Suspense>
  </StrictMode>,
)
