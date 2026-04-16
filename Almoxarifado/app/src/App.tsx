import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Estoque = lazy(() => import('./pages/Estoque').then(m => ({ default: m.Estoque })));
const Ferramentas = lazy(() => import('./pages/Ferramentas').then(m => ({ default: m.Ferramentas })));
const Movimentacoes = lazy(() => import('./pages/Movimentacoes').then(m => ({ default: m.Movimentacoes })));
const Requisicoes = lazy(() => import('./pages/Requisicoes').then(m => ({ default: m.Requisicoes })));
const Solicitacoes = lazy(() => import('./pages/Solicitacoes').then(m => ({ default: m.Solicitacoes })));
const Frota = lazy(() => import('./pages/Frota').then(m => ({ default: m.Frota })));
const MeusDispositivos = lazy(() => import('./pages/MeusDispositivos').then(m => ({ default: m.MeusDispositivos })));
const Relatorios = lazy(() => import('./pages/Relatorios').then(m => ({ default: m.Relatorios })));
const Calendario = lazy(() => import('./pages/Calendario').then(m => ({ default: m.Calendario })));
const Reunioes = lazy(() => import('./pages/Reunioes').then(m => ({ default: m.Reunioes })));
const Membros = lazy(() => import('./pages/Membros').then(m => ({ default: m.Membros })));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<LayoutAutenticado />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/ferramentas" element={<Ferramentas />} />
              <Route path="/movimentacoes" element={<Movimentacoes />} />
              <Route path="/requisicoes" element={<Requisicoes />} />
              <Route path="/solicitacoes" element={<Solicitacoes />} />
              <Route path="/frota" element={<Frota />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/meus-dispositivos" element={<MeusDispositivos />} />
              <Route path="/reunioes" element={<Reunioes />} />
              <Route path="/membros" element={<Membros />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
