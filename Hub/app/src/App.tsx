import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { Login } from './pages/Login';
import { HubPortal } from './pages/HubPortal';
import { Membros } from './pages/Membros';
import { MeusDispositivos } from './pages/MeusDispositivos';
import { GerenciarAcessos } from './pages/GerenciarAcessos';
import { DefinirSenha } from './pages/DefinirSenha';
import { UpdateChecker } from './components/UpdateChecker';

function AppRoutes() {
  const { isAuthenticated, precisaDefinirSenha } = useAuth();

  // Se logado mas ainda não definiu senha → tela de definir senha
  if (isAuthenticated && precisaDefinirSenha) {
    return <DefinirSenha />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<LayoutAutenticado />}>
        <Route path="/" element={<HubPortal />} />
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
