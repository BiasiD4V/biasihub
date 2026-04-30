import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { Login } from './pages/Login';
import { HubPortal } from './pages/HubPortal';
import { Membros } from './pages/Membros';
import { MeusDispositivos } from './pages/MeusDispositivos';
import { GerenciarAcessos } from './pages/GerenciarAcessos';
import { Agentes } from './pages/Agentes';
import { DefinirSenha } from './pages/DefinirSenha';
import { UpdateChecker } from './components/UpdateChecker';
import { LandingPublica } from './pages/LandingPublica';
import { RequisicaoPublica } from './pages/RequisicaoPublica';
import { FilaPublica } from './pages/FilaPublica';

function AppRoutes() {
  const { isAuthenticated, precisaDefinirSenha } = useAuth();

  // Se logado mas ainda não definiu senha → tela de definir senha
  if (isAuthenticated && precisaDefinirSenha) {
    return <DefinirSenha />;
  }

  return (
    <Routes>
      {/* Rotas públicas — sem login */}
      <Route path="/obra" element={<LandingPublica />} />
      <Route path="/req" element={<RequisicaoPublica />} />
      <Route path="/fila" element={<FilaPublica />} />
      <Route path="/login" element={<Login />} />
      <Route element={<LayoutAutenticado />}>
        <Route path="/" element={<HubPortal />} />
        <Route path="/agentes" element={<Agentes />} />
        <Route path="/membros" element={<Membros />} />
        <Route path="/meus-dispositivos" element={<MeusDispositivos />} />
        <Route path="/gerenciar-acessos" element={<GerenciarAcessos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
        <UpdateChecker />
      </AuthProvider>
    </HashRouter>
  );
}
