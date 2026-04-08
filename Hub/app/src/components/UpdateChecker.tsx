import { useEffect, useState } from 'react';
import { AlertCircle, Download, X, RefreshCw, CheckCircle } from 'lucide-react';

interface UpdateStatus {
  hasUpdate: boolean;
  version: string | null;
  currentVersion: string;
  error?: string;
}

type Phase = 'idle' | 'downloading' | 'ready' | 'error';

export function UpdateChecker() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const bridge = (window as any).electronBridge;

  // Verifica atualização ao montar e a cada 30min
  useEffect(() => {
    if (!bridge) return;

    async function check() {
      try {
        const result = await bridge.checkForUpdates?.();
        if (result?.currentVersion) {
          setUpdateStatus(result);
          if (result.hasUpdate && !dismissed) setShowNotification(true);
        }
      } catch (e) {
        console.error('[UpdateChecker] erro ao verificar:', e);
      }
    }

    check();
    const t = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [dismissed]);

  // Escuta progresso e conclusão do download
  useEffect(() => {
    if (!bridge) return;

    bridge.onDownloadProgress?.((info: { percent: number }) => {
      setProgress(info.percent);
    });

    bridge.onUpdateDownloaded?.(() => {
      setPhase('ready');
      setProgress(100);
    });
  }, []);

  async function handleStartDownload() {
    setPhase('downloading');
    setProgress(0);
    setErrorMsg('');
    try {
      const result = await bridge?.downloadAndInstall?.();
      if (!result?.success) {
        setPhase('error');
        setErrorMsg(result?.error || 'Erro ao iniciar download');
      }
      // Se success: true, o download está em andamento — aguardamos onUpdateDownloaded
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e?.message || 'Erro de conexão');
    }
  }

  function handleQuitAndInstall() {
    bridge?.quitAndInstall?.();
  }

  function handleDismiss() {
    setShowNotification(false);
    setDismissed(true);
  }

  // Não mostra se não há update ou se o usuário fechou (exceto quando já baixou)
  if (!updateStatus?.hasUpdate || (!showNotification && phase !== 'ready')) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-80">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {phase === 'ready' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm">
              {phase === 'ready' ? 'Download concluído!' : 'Atualização disponível'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {phase === 'ready'
                ? 'Clique em Reiniciar para instalar a v' + updateStatus.version
                : `v${updateStatus.version} disponível · você tem v${updateStatus.currentVersion}`}
            </p>
          </div>
          {phase === 'idle' && (
            <button onClick={handleDismiss} className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barra de progresso */}
        {phase === 'downloading' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Baixando atualização...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Erro */}
        {phase === 'error' && errorMsg && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Botões */}
        <div className="mt-3 flex gap-2">
          {phase === 'idle' && (
            <>
              <button
                onClick={handleStartDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Atualizar agora
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Depois
              </button>
            </>
          )}

          {phase === 'downloading' && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Aguarde...
            </div>
          )}

          {phase === 'ready' && (
            <button
              onClick={handleQuitAndInstall}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Reiniciar e atualizar
            </button>
          )}

          {phase === 'error' && (
            <button
              onClick={handleStartDownload}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
