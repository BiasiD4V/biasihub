import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

// Providers
import { AuthProvider } from './context/AuthContext';
import { CadastrosMestresProvider } from './context/CadastrosMestresContext';
import { ClientesProvider } from './context/ClientesContext';
import { NovoOrcamentoProvider } from './context/NovoOrcamentoContext';

// Layout autenticado
import { LayoutAutenticado } from './components/layout/LayoutAutenticado';
import { RedirectToDashboard } from './components/RedirectToDashboard';

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

function AutoLoginSetupCheck() {
  const [showSetup, setShowSetup] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check se já tentou setup
    if (localStorage.getItem('auto_login_setup_checked')) {
      setChecked(true);
      return;
    }

    // Tentar verificar se as colunas existem
    const checkSetup = async () => {
      try {
        const { supabase } = await import('./infrastructure/supabase/client');
        const { data, error } = await supabase
          .from('device_sessions')
          .select('access_token')
          .limit(0);

        if (error && error.message.includes('column')) {
          // Coluna não existe, precisa setup
          setShowSetup(true);
        } else {
          // Já está configurado
          localStorage.setItem('auto_login_setup_checked', 'true');
        }
      } catch (e) {
        // Erro na checagem, marcar como feito para não ficar incomodando
        localStorage.setItem('auto_login_setup_checked', 'true');
      }
      setChecked(true);
    };

    checkSetup();
  }, []);

  if (!showSetup || !checked) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-md p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-slate-900">Setup do Auto-Login</h3>
            <p className="text-sm text-slate-600 mt-1">
              Para completar a funcionalidade de "Remember Me", clique no botão abaixo para executar um SQL rápido no Supabase (30 segundos):
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-xs text-blue-700 space-y-1">
          <p>✅ Adiciona suporte a tokens de autenticação</p>
          <p>✅ Habilita auto-login automático ao reacessar</p>
          <p>✅ 100% reversível, sem risco de dados</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              localStorage.setItem('auto_login_setup_checked', 'true');
              setShowSetup(false);
            }}
            className="flex-1 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Fazer Depois
          </button>
          <button
            onClick={() => {
              const projectRef = 'fuwlsgybdftqgimtwqhb';
              window.open(`https://supabase.com/dashboard/project/${projectRef}/sql/new`, '_blank');
              localStorage.setItem('auto_login_setup_checked', 'true');
              setShowSetup(false);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Setup Agora
          </button>
        </div>
        
        <p className="text-xs text-slate-400 mt-4 text-center">
          Depois que clicar "Setup Agora", abra o Supabase e clique RUN. Assista o vídeo rápido no Supabase se precisar de ajuda.
        </p>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <CadastrosMestresProvider>
          <ClientesProvider>
          <NovoOrcamentoProvider>
            <AutoLoginSetupCheck />
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
                  <Route path="/dashboard" element={<DashboardNovo />} />
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
                  <Route path="/operacao/orcamentos" element={<Propostas />} />
                  <Route path="/meus-dispositivos" element={<MeusDispositivos />} />
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
