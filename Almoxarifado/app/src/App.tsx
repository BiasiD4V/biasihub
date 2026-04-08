import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { AuthProvider } from './context/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { Estoque } from './pages/Estoque';
import { Movimentacoes } from './pages/Movimentacoes';
import { Requisicoes } from './pages/Requisicoes';
import { Solicitacoes } from './pages/Solicitacoes';
import { Frota } from './pages/Frota';
import { MeusDispositivos } from './pages/MeusDispositivos';
import { Relatorios } from './pages/Relatorios';
import { EPI } from './pages/EPI';
import { Fornecedores } from './pages/Fornecedores';
import { OrdensCompra } from './pages/OrdensCompra';
import { Login } from './pages/Login';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<LayoutAutenticado />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/movimentacoes" element={<Movimentacoes />} />
            <Route path="/requisicoes" element={<Requisicoes />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route path="/frota" element={<Frota />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/epi" element={<EPI />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/ordens-compra" element={<OrdensCompra />} />
            <Route path="/meus-dispositivos" element={<MeusDispositivos />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
