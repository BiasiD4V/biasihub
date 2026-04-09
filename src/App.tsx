import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { AuthProvider } from './context/AuthContext';
import { CadastrosMestresProvider } from './context/CadastrosMestresContext';
import { ClientesProvider } from './context/ClientesContext';
import { NovoOrcamentoProvider } from './context/NovoOrcamentoContext';
import { ConfiguracaoDebug } from './pages/ConfiguracaoDebug';
import { Configuracoes } from './pages/Configuracoes';
import { ConfiguradorUUIDs } from './pages/ConfiguradorUUIDs';
import { CriarPlanilha } from './pages/CriarPlanilha';
import { DiarioDeObra } from './pages/DiarioDeObra';
import { Indicacoes } from './pages/Indicacoes';
import { InclusoExcluso } from './pages/InclusoExcluso';
import { Insumos } from './pages/Insumos';
import { MaoDeObra } from './pages/MaoDeObra';
import { Membros } from './pages/Membros';
import { MeusDispositivos } from './pages/MeusDispositivos';
import { OrcamentoDetalhe } from './pages/OrcamentoDetalhe';
import { OrcamentosKanban } from './pages/OrcamentosKanban';
import { OrcamentosNovos } from './pages/OrcamentosNovos';
import { PlanilhaOrcamentaria } from './pages/PlanilhaOrcamentaria';
import { Propostas } from './pages/Propostas';
import { Aprovacoes } from './pages/Aprovacoes';
import { Bira } from './pages/Bira';
import { ArenaComercial } from './pages/ArenaComercial';
import { Clientes } from './pages/Clientes';
import { Composicoes } from './pages/Composicoes';
import { Fornecedores } from './pages/Fornecedores';
import { Login } from './pages/Login';
import { Templates } from './pages/Templates';

const DashboardBI = lazy(() => import('./pages/DashboardBI').then((m) => ({ default: m.DashboardBI })));

export function App() {
  return (
    <AuthProvider>
      <CadastrosMestresProvider>
        <ClientesProvider>
          <NovoOrcamentoProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/debug" element={<ConfiguracaoDebug />} />
                <Route path="/setup-uuids" element={<ConfiguradorUUIDs />} />

                <Route element={<LayoutAutenticado />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </NovoOrcamentoProvider>
        </ClientesProvider>
      </CadastrosMestresProvider>
    </AuthProvider>
  );
}
