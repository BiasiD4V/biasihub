import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { AuthProvider } from './context/AuthContext';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import { SuspenseFallback } from './components/SuspenseFallback';
import { Login } from './pages/Login';
import { RequisicaoPublica } from './pages/RequisicaoPublica';
import { FilaPublica } from './pages/FilaPublica';
import { LandingPublica } from './pages/LandingPublica';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Estoque = lazy(() => import('./pages/Estoque').then(m => ({ default: m.Estoque })));
const Ferramentas = lazy(() => import('./pages/Ferramentas').then(m => ({ default: m.Ferramentas })));
const Movimentacoes = lazy(() => import('./pages/Movimentacoes').then(m => ({ default: m.Movimentacoes })));
const Requisicoes = lazy(() => import('./pages/Requisicoes').then(m => ({ default: m.Requisicoes })));
const GerenciadorSolicitacoes = lazy(() => import('./pages/GerenciadorSolicitacoes').then(m => ({ default: m.GerenciadorSolicitacoes })));
const RastreioEntregaMateriais = lazy(() => import('./pages/RastreioEntregaMateriais').then(m => ({ default: m.RastreioEntregaMateriais })));
const HistoricoRequisicoes = lazy(() => import('./pages/HistoricoRequisicoes').then(m => ({ default: m.HistoricoRequisicoes })));
const ControleDevolucao = lazy(() => import('./pages/ControleDevolucao').then(m => ({ default: m.ControleDevolucao })));
const Frota = lazy(() => import('./pages/Frota').then(m => ({ default: m.Frota })));
const MeusDispositivos = lazy(() => import('./pages/MeusDispositivos').then(m => ({ default: m.MeusDispositivos })));
const Relatorios = lazy(() => import('./pages/Relatorios').then(m => ({ default: m.Relatorios })));
const Calendario = lazy(() => import('./pages/Calendario').then(m => ({ default: m.Calendario })));
const Reunioes = lazy(() => import('./pages/Reunioes').then(m => ({ default: m.Reunioes })));
const Membros = lazy(() => import('./pages/Membros').then(m => ({ default: m.Membros })));
const Obras = lazy(() => import('./pages/Obras').then(m => ({ default: m.Obras })));
const Agentes = lazy(() => import('./pages/Agentes').then(m => ({ default: m.Agentes })));

const IS_ELECTRON = navigator.userAgent.includes('Electron');

export default function App() {
  return (
    <ChunkErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
            {/* Raiz:
                  - No Desktop (Electron): vai pra /dashboard (equipe interna logada).
                  - No web (Vercel): vai pra /obra (porta pública pro pessoal de campo).
                A URL biasihub-almoxarifado-weld.vercel.app abre direto a landing
                da requisição. Equipe interna que precisa logar via web acessa
                /login direto. */}
            <Route
              path="/"
              element={
                <Navigate
                  to={IS_ELECTRON ? '/dashboard' : '/obra'}
                  replace
                />
              }
            />

            {/* Rotas públicas — sem login na web; no Electron redirecionam para o fluxo interno */}
            <Route path="/obra" element={IS_ELECTRON ? <Navigate to="/dashboard" replace /> : <LandingPublica />} />
            <Route path="/req" element={IS_ELECTRON ? <Navigate to="/requisicoes" replace /> : <RequisicaoPublica />} />
            <Route path="/fila" element={IS_ELECTRON ? <Navigate to="/solicitacoes/gerenciar" replace /> : <FilaPublica />} />
            <Route path="/rastreio" element={IS_ELECTRON ? <Navigate to="/solicitacoes/rastreio" replace /> : <RastreioEntregaMateriais />} />
            <Route path="/login" element={<Login />} />
            <Route element={<LayoutAutenticado />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/ferramentas" element={<Ferramentas />} />
              <Route path="/movimentacoes" element={<Movimentacoes />} />
              <Route path="/obras" element={<Obras />} />
              <Route path="/requisicoes" element={<Requisicoes />} />
              <Route path="/solicitacoes" element={<Navigate to="/solicitacoes/gerenciar" replace />} />
              <Route path="/solicitacoes/gerenciar" element={<GerenciadorSolicitacoes />} />
              <Route path="/solicitacoes/rastreio" element={<RastreioEntregaMateriais />} />
              <Route path="/solicitacoes/historico" element={<HistoricoRequisicoes />} />
              <Route path="/solicitacoes/devolucoes" element={<ControleDevolucao />} />
              <Route path="/frota" element={<Frota />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/meus-dispositivos" element={<MeusDispositivos />} />
              <Route path="/reunioes" element={<Reunioes />} />
              <Route path="/membros" element={<Membros />} />
              <Route path="/agentes" element={<Agentes />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ChunkErrorBoundary>
  );
}
