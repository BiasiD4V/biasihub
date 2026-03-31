import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

export function SetupAutoLogin() {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    // Na primeira carga, tentar configurar o auto-login
    setupAutoLogin();
  }, []);

  async function setupAutoLogin() {
    try {
      // Abrir SQL Editor do Supabase com o SQL preparado
      const sqlCommand = `
ALTER TABLE public.device_sessions 
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

CREATE INDEX IF NOT EXISTS idx_device_sessions_refresh_token 
ON public.device_sessions(refresh_token) 
WHERE refresh_token IS NOT NULL;
      `.trim();

      const encodedSql = encodeURIComponent(sqlCommand);
      const supabaseUrl = 'https://fuwlsgybdftqgimtwqhb.supabase.co';
      const projectRef = 'fuwlsgybdftqgimtwqhb';

      // URL do Supabase SQL Editor
      const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new?sql=${encodedSql}`;

      // Verificar se as colunas já existem
      const { supabase } = await import('../supabase/client');
      try {
        const { data, error } = await supabase
          .from('device_sessions')
          .select('access_token')
          .limit(0);

        if (!error) {
          // Colunas já existem!
          setStatus('done');
          return;
        }
      } catch (e) {
        // Colunas não existem, precisa configurar
      }

      // Redirecionar para SQL Editor
      console.log('🔗 Abrindo SQL Editor do Supabase...');
      window.location.href = sqlEditorUrl;
      setStatus('done');
    } catch (error) {
      console.error('Erro:', error);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-md p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-700">Auto-Login Configurado!</h3>
              <p className="text-sm text-slate-600 mt-1">
                Se você foi redirecionado para o Supabase SQL Editor:
              </p>
              <ol className="text-sm text-slate-600 mt-2 space-y-1 ml-4 list-decimal">
                <li>Clique no botão RUN para executar o SQL</li>
                <li>Volte para o app</li>
                <li>Pronto! Agora o Remember Me vai fazer auto-login 🎉</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-md p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-700">Executar Setup Manualmente</h3>
              <p className="text-sm text-slate-600 mt-1 mb-4">
                Clique no botão abaixo para abrir o Supabase SQL Editor com o SQL pronto:
              </p>
              <button
                onClick={() => {
                  const sqlCommand = `ALTER TABLE public.device_sessions ADD COLUMN IF NOT EXISTS access_token TEXT, ADD COLUMN IF NOT EXISTS refresh_token TEXT; CREATE INDEX IF NOT EXISTS idx_device_sessions_refresh_token ON public.device_sessions(refresh_token) WHERE refresh_token IS NOT NULL;`;
                  const projectRef = 'fuwlsgybdftqgimtwqhb';
                  window.open(`https://supabase.com/dashboard/project/${projectRef}/sql/new`, '_blank');
                }}
                className="flex items-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                Abrir SQL Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
