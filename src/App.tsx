import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { AuthProvider } from './context/AuthContext';
import { CadastrosMestresProvider } from './context/CadastrosMestresContext';
import { ClientesProvider } from './context/ClientesContext';
import { NovoOrcamentoProvider } from './context/NovoOrcamentoContext';

// Layout autenticado
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { RedirectToDashboard } from './components/RedirectToDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

// Páginas públicas
import { Login } from './pages/Login';
import { ConfiguracaoDebug } from './pages/ConfiguracaoDebug';
import { ConfiguradorUUIDs } from './pages/ConfiguradorUUIDs';

// Páginas autenticadas
import { DashboardNovo } from './pages/DashboardNovo';
import { Configuracoes } from './pages/Configuracoes';
import { OrcamentosNovos } from './pages/OrcamentosNovos';
import { OrcamentosKanban } from './pages/OrcamentosKanban';
import { OrcamentoDetalhe } from './pages/OrcamentoDetalhe';
import { Clientes } from './pages/Clientes';
import { Fornecedores } from './pages/Fornecedores';
import { Insumos } from './pages/Insumos';
import { Composicoes } from './pages/Composicoes';
import { Templates } from './pages/Templates';
import { Aprovacoes } from './pages/Aprovacoes';
import { Relatorios } from './pages/Relatorios';
import { Propostas } from './pages/Propostas';
import { MaoDeObra } from './pages/MaoDeObra';
import { InclusoExcluso } from './pages/InclusoExcluso';
import { MeusDispositivos } from './pages/MeusDispositivos';
import { Membros } from './pages/Membros';
import { PlanilhaOrcamentaria } from './pages/PlanilhaOrcamentaria';
import { CriarPlanilha } from './pages/CriarPlanilha';

const DashboardBI = lazy(() => import('./pages/DashboardBI').then((m) => ({ default: m.DashboardBI })));

export function App() {
  return (
    <AuthProvider>
      <CadastrosMestresProvider>
          <ClientesProvider>
          <NovoOrcamentoProvider>
            <BrowserRouter>
              <Routes>
                {/* Rota pública */}
                <Route path="/login" element={<Login />} />
                <Route path="/debug" element={<ConfiguracaoDebug />} />
                <Route path="/setup-uuids" element={<ConfiguradorUUIDs />} />

                {/* Raiz → redireciona baseado na autenticação */}
                <Route path="/" element={<RedirectToDashboard />} />

                {/* Rotas autenticadas — verificação feita no LayoutAutenticado */}
                <Route element={<LayoutAutenticado />}>
                  <Route
                    path="/dashboard"
                    element={(
                      <ErrorBoundary>
                        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Carregando BI...</div>}>
                          <DashboardBI />
                        </Suspense>
                      </ErrorBoundary>
                    )}
                  />
                  <Route path="/dashboard-antigo" element={<DashboardNovo />} />
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
                  <Route path="/relatorios" element={<Relatorios />} />
                  <Route path="/bi" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/operacao/orcamentos" element={<Propostas />} />
                  <Route path="/meus-dispositivos" element={<MeusDispositivos />} />
                  <Route path="/membros" element={<Membros />} />
                  <Route path="/planilha-orcamentaria" element={<PlanilhaOrcamentaria />} />
                  <Route path="/planilha-orcamentaria/nova" element={<CriarPlanilha />} />
                  <Route path="/planilha-orcamentaria/:id" element={<CriarPlanilha />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </NovoOrcamentoProvider>
          </ClientesProvider>
        </CadastrosMestresProvider>
    </AuthProvider>
  );
}
