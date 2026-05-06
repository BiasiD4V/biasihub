import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CadastrosMestresProvider } from './context/CadastrosMestresContext';
import { ClientesProvider } from './context/ClientesContext';
import { NovoOrcamentoProvider } from './context/NovoOrcamentoContext';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const DashboardBI         = lazy(() => import('./pages/DashboardBI').then(m => ({ default: m.DashboardBI })));
const OrcamentosNovos     = lazy(() => import('./pages/OrcamentosNovos').then(m => ({ default: m.OrcamentosNovos })));
const OrcamentosKanban    = lazy(() => import('./pages/OrcamentosKanban').then(m => ({ default: m.OrcamentosKanban })));
const OrcamentoDetalhe    = lazy(() => import('./pages/OrcamentoDetalhe').then(m => ({ default: m.OrcamentoDetalhe })));
const Bira                = lazy(() => import('./pages/Bira').then(m => ({ default: m.Bira })));
const Aprovacoes          = lazy(() => import('./pages/Aprovacoes').then(m => ({ default: m.Aprovacoes })));
const Reunioes            = lazy(() => import('./pages/Reunioes').then(m => ({ default: m.Reunioes })));
const ArenaComercial      = lazy(() => import('./pages/ArenaComercial').then(m => ({ default: m.ArenaComercial })));
const Clientes            = lazy(() => import('./pages/Clientes').then(m => ({ default: m.Clientes })));
const Fornecedores        = lazy(() => import('./pages/Fornecedores').then(m => ({ default: m.Fornecedores })));
const Insumos             = lazy(() => import('./pages/Insumos').then(m => ({ default: m.Insumos })));
const Composicoes         = lazy(() => import('./pages/Composicoes').then(m => ({ default: m.Composicoes })));
const Templates           = lazy(() => import('./pages/Templates').then(m => ({ default: m.Templates })));
const MaoDeObra           = lazy(() => import('./pages/MaoDeObra').then(m => ({ default: m.MaoDeObra })));
const InclusoExcluso      = lazy(() => import('./pages/InclusoExcluso').then(m => ({ default: m.InclusoExcluso })));
const Propostas           = lazy(() => import('./pages/Propostas').then(m => ({ default: m.Propostas })));
const PlanilhaOrcamentaria= lazy(() => import('./pages/PlanilhaOrcamentaria').then(m => ({ default: m.PlanilhaOrcamentaria })));
const CriarPlanilha       = lazy(() => import('./pages/CriarPlanilha').then(m => ({ default: m.CriarPlanilha })));
const DiarioDeObra        = lazy(() => import('./pages/DiarioDeObra').then(m => ({ default: m.DiarioDeObra })));
const Indicacoes          = lazy(() => import('./pages/Indicacoes').then(m => ({ default: m.Indicacoes })));
const AdmCentral          = lazy(() => import('./pages/AdmCentral').then(m => ({ default: m.AdmCentral })));
const Aprendizados        = lazy(() => import('./pages/Aprendizados').then(m => ({ default: m.Aprendizados })));
const Membros             = lazy(() => import('./pages/Membros').then(m => ({ default: m.Membros })));
const MeusDispositivos    = lazy(() => import('./pages/MeusDispositivos').then(m => ({ default: m.MeusDispositivos })));
const Configuracoes       = lazy(() => import('./pages/Configuracoes').then(m => ({ default: m.Configuracoes })));
const ConfiguracaoDebug   = lazy(() => import('./pages/ConfiguracaoDebug').then(m => ({ default: m.ConfiguracaoDebug })));
const ConfiguradorUUIDs   = lazy(() => import('./pages/ConfiguradorUUIDs').then(m => ({ default: m.ConfiguradorUUIDs })));
const Aparencia           = lazy(() => import('./pages/Aparencia').then(m => ({ default: m.Aparencia })));

const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
  </div>
);

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <CadastrosMestresProvider>
        <ClientesProvider>
          <NovoOrcamentoProvider>
            <HashRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/debug" element={<ConfiguracaoDebug />} />
                  <Route path="/setup-uuids" element={<ConfiguradorUUIDs />} />

                  <Route element={<LayoutAutenticado />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route
                      path="/dashboard"
                      element={(
                        <ErrorBoundary>
                          <DashboardBI />
                        </ErrorBoundary>
                      )}
                    />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/orcamentos" element={<OrcamentosNovos />} />
                    <Route path="/orcamentos/kanban" element={<OrcamentosKanban />} />
                    <Route path="/orcamentos/:id" element={<OrcamentoDetalhe />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/fornecedores" element={<Fornecedores />} />
                    <Route path="/insumos" element={<Insumos />} />
                    <Route path="/composicoes" element={<Composicoes />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/mao-de-obra" element={<MaoDeObra />} />
                    <Route path="/incluso-excluso" element={<InclusoExcluso />} />
                    <Route path="/aprovacoes" element={<Aprovacoes />} />
                    <Route path="/bira" element={<Bira />} />
                    <Route path="/arena" element={<ArenaComercial />} />
                    <Route path="/reunioes" element={<Reunioes />} />
                    <Route path="/rdo" element={<DiarioDeObra />} />
                    <Route path="/obras" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/bi" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/operacao/orcamentos" element={<Propostas />} />
                    <Route path="/meus-dispositivos" element={<MeusDispositivos />} />
                    <Route path="/membros" element={<Membros />} />
                    <Route path="/planilha-orcamentaria" element={<PlanilhaOrcamentaria />} />
                    <Route path="/planilha-orcamentaria/nova" element={<CriarPlanilha />} />
                    <Route path="/planilha-orcamentaria/:id" element={<CriarPlanilha />} />
                    <Route path="/indicacoes" element={<Indicacoes />} />
                    <Route path="/adm-central" element={<AdmCentral />} />
                    <Route path="/aprendizados" element={<Aprendizados />} />
                    <Route path="/aparencia" element={<Aparencia />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </NovoOrcamentoProvider>
        </ClientesProvider>
      </CadastrosMestresProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
