import MeuPerfil from './pages/MeuPerfil'
import ProtectedRoute from './components/ProtectedRoute'
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ChatProvider } from './components/claudia/ChatContext'
import ChatWindow from './components/claudia/ChatWindow'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import BoasVindas from './pages/BoasVindas'
import Obras from './pages/Obras'
import ObraDetalhe from './pages/ObraDetalhe'
import Orcamento from './pages/Orcamento'
import Medicoes from './pages/Medicoes'
import Cronograma from './pages/Cronograma'
import Evm from './pages/Evm'
import Reprogramacao from './pages/Reprogramacao'
import AuditLog from './pages/AuditLog'
import DiarioObra from './pages/DiarioObra'
import RelatorioDiario from './pages/RelatorioDiario'
import GestaoTarefas from './pages/GestaoTarefas'
import CurvaABC from './pages/CurvaABC'
import Financeiro from './pages/Financeiro'
import PrevistoxRealizado from './pages/PrevistoxRealizado'
import Glossario from './pages/Glossario'
import SiengeSync from './pages/SiengeSync'
import Contratos from './pages/Contratos'
import ContratoDetalhe from './pages/ContratoDetalhe'
import MedicoesContrato from './pages/MedicoesContrato'
import CustosMaoObra from './pages/CustosMaoObra'
import Suprimentos from './pages/Suprimentos'
import DespesasIndiretas from './pages/DespesasIndiretas'
import AdmCentral from './pages/AdmCentral'
import Resultado from './pages/Resultado'
// Módulo Planejamento
import DashboardPlanejamento from './pages/planejamento/DashboardPlanejamento'
import CronogramaPlanejamento from './pages/planejamento/CronogramaPlanejamento'
import Recursos from './pages/planejamento/Recursos'
import HistogramaMO from './pages/planejamento/HistogramaMO'
import ProgressoSemanal from './pages/planejamento/ProgressoSemanal'
import CurvaS from './pages/planejamento/CurvaS'
import EvmPlanejamento from './pages/planejamento/EvmPlanejamento'
import ReprogramacaoPlanejamento from './pages/planejamento/ReprogramacaoPlanejamento'
import RelatorioSemanal from './pages/planejamento/RelatorioSemanal'

// URL do Hub para redirecionar quando não autenticado
const IS_ELECTRON = navigator.userAgent.includes('Electron')
const HUB_URL = IS_ELECTRON ? 'app://hub.local/' : 'https://biasihub-portal.vercel.app'

function RotaProtegida({ children }) {
  const { isLogado, carregando } = useAuth()

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f2f7' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: '#e5e7eb', borderTopColor: '#233772' }} />
        <p className="text-sm font-medium" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
          Verificando sessão...
        </p>
      </div>
    </div>
  )

  // Se não autenticado, volta ao Hub (não mostra login próprio)
  if (!isLogado) {
    window.location.href = HUB_URL
    return null
  }
  return children
}

function AppRoutes() {
  const { isLogado } = useAuth()

  return (
    <>
    <Routes>
      <Route path="/" element={
        <RotaProtegida>
          <Layout />
        </RotaProtegida>
      }>
        <Route index element={<BoasVindas />} />
        <Route path="boas-vindas" element={<BoasVindas />} />
        <Route path="dashboard" element={
          <ProtectedRoute permissao="ver_dashboard">
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="obras" element={
          <ProtectedRoute permissao={['ver_todas_obras', 'ver_obras_proprias']}>
            <Obras />
          </ProtectedRoute>
        } />
        <Route path="obras/:id" element={
          <ProtectedRoute permissao={['ver_todas_obras', 'ver_obras_proprias']}>
            <ObraDetalhe />
          </ProtectedRoute>
        } />
        <Route path="contratos" element={
          <ProtectedRoute permissao="ver_contratos">
            <Contratos />
          </ProtectedRoute>
        } />
        <Route path="contratos/:id" element={
          <ProtectedRoute permissao="ver_contratos">
            <ContratoDetalhe />
          </ProtectedRoute>
        } />
        <Route path="medicoes-contrato" element={
          <ProtectedRoute permissao="ver_medicoes">
            <MedicoesContrato />
          </ProtectedRoute>
        } />
        <Route path="orcamento" element={
          <ProtectedRoute permissao="ver_orcamento">
            <Orcamento />
          </ProtectedRoute>
        } />
        <Route path="medicoes" element={
          <ProtectedRoute permissao="ver_medicoes">
            <Medicoes />
          </ProtectedRoute>
        } />
        <Route path="cronograma" element={
          <ProtectedRoute permissao="ver_planejamento">
            <Cronograma />
          </ProtectedRoute>
        } />
        <Route path="evm" element={
          <ProtectedRoute permissao="ver_evm">
            <Evm />
          </ProtectedRoute>
        } />
        <Route path="reprogramacao" element={
          <ProtectedRoute permissao="solicitar_reprogramacao">
            <Reprogramacao />
          </ProtectedRoute>
        } />
        <Route path="perfil" element={<MeuPerfil />} />
        <Route path="diario-obra" element={
          <ProtectedRoute permissao="diario_obra">
            <DiarioObra />
          </ProtectedRoute>
        } />
        <Route path="relatorio-diario" element={
          <ProtectedRoute permissao="ver_relatorio_diario">
            <RelatorioDiario />
          </ProtectedRoute>
        } />
        <Route path="tarefas" element={
          <ProtectedRoute permissao="gestao_tarefas">
            <GestaoTarefas />
          </ProtectedRoute>
        } />
        <Route path="curva-abc" element={
          <ProtectedRoute permissao="ver_curva_abc">
            <CurvaABC />
          </ProtectedRoute>
        } />
        <Route path="financeiro" element={
          <ProtectedRoute permissao="ver_financeiro">
            <Financeiro />
          </ProtectedRoute>
        } />
        <Route path="previsto-realizado" element={
          <ProtectedRoute permissao="ver_previsto_realizado">
            <PrevistoxRealizado />
          </ProtectedRoute>
        } />
        <Route path="custos-mo" element={
          <ProtectedRoute permissao="ver_custos_mo">
            <CustosMaoObra />
          </ProtectedRoute>
        } />
        <Route path="suprimentos" element={
          <ProtectedRoute permissao="ver_suprimentos">
            <Suprimentos />
          </ProtectedRoute>
        } />
        <Route path="despesas-indiretas" element={
          <ProtectedRoute permissao="ver_di">
            <DespesasIndiretas />
          </ProtectedRoute>
        } />
        <Route path="adm-central" element={
          <ProtectedRoute permissao="ver_adm_central">
            <AdmCentral />
          </ProtectedRoute>
        } />
        <Route path="resultado" element={
          <ProtectedRoute permissao="ver_resultado">
            <Resultado />
          </ProtectedRoute>
        } />
        <Route path="glossario" element={<Glossario />} />
        <Route path="audit-log" element={
          <ProtectedRoute permissao="gerenciar_acessos">
            <AuditLog />
          </ProtectedRoute>
        } />
        <Route path="sienge-sync" element={
          <ProtectedRoute permissao="sienge_sync">
            <SiengeSync />
          </ProtectedRoute>
        } />
        {/* Módulo Planejamento */}
        <Route path="planejamento" element={
          <ProtectedRoute permissao="ver_planejamento">
            <DashboardPlanejamento />
          </ProtectedRoute>
        } />
        <Route path="planejamento/cronograma" element={
          <ProtectedRoute permissao="ver_cronograma">
            <CronogramaPlanejamento />
          </ProtectedRoute>
        } />
        <Route path="planejamento/recursos" element={
          <ProtectedRoute permissao="ver_planejamento">
            <Recursos />
          </ProtectedRoute>
        } />
        <Route path="planejamento/histograma-mo" element={
          <ProtectedRoute permissao="ver_planejamento">
            <HistogramaMO />
          </ProtectedRoute>
        } />
        <Route path="planejamento/progresso" element={
          <ProtectedRoute permissao="ver_progresso">
            <ProgressoSemanal />
          </ProtectedRoute>
        } />
        <Route path="planejamento/curva-s" element={
          <ProtectedRoute permissao="ver_curva_s">
            <CurvaS />
          </ProtectedRoute>
        } />
        <Route path="planejamento/evm" element={
          <ProtectedRoute permissao="ver_evm">
            <EvmPlanejamento />
          </ProtectedRoute>
        } />
        <Route path="planejamento/reprogramacao" element={
          <ProtectedRoute permissao="solicitar_reprogramacao">
            <ReprogramacaoPlanejamento />
          </ProtectedRoute>
        } />
        <Route path="planejamento/relatorio" element={
          <ProtectedRoute permissao="ver_relatorio">
            <RelatorioSemanal />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {/* ClaudIA só aparece após autenticação */}
    {isLogado && <ChatWindow />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ChatProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ChatProvider>
    </BrowserRouter>
  );
}
