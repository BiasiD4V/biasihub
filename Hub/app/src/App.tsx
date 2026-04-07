import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { Login } from './pages/Login';
import { HubPortal } from './pages/HubPortal';
import { Membros } from './pages/Membros';
import { MeusDispositivos } from './pages/MeusDispositivos';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<LayoutAutenticado />}>
            <Route path="/" element={<HubPortal />} />
            <Route path="/membros" element={<Membros />} />
            <Route path="/meus-dispositivos" element={<MeusDispositivos />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
