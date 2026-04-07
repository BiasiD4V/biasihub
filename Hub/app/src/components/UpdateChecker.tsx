import { useEffect, useState } from 'react';
import { AlertCircle, Download, X, RefreshCw } from 'lucide-react';

interface UpdateStatus {
  hasUpdate: boolean;
  version: string | null;
  currentVersion: string;
  error?: string;
}

interface DownloadStatus {
  downloading: boolean;
  progress: number;
  error?: string;
}

export function UpdateChecker() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({ downloading: false, progress: 0 });
  const [showNotification, setShowNotification] = useState(false);
  const [notificationDismissed, setNotificationDismissed] = useState(false);

  // Check for updates on mount and every 30 minutes
  useEffect(() => {
    async function checkUpdate() {
      try {
        const result = await (window as any).electronBridge?.checkForUpdates?.();
        if (result && result.currentVersion) {
          setUpdateStatus(result);
          if (result.hasUpdate && !notificationDismissed) {
            setShowNotification(true);
          }
        }
      } catch (err) {
        console.error('[UpdateChecker] erro ao verificar:', err);
      }
    }

    // Só verifica se estiver rodando no Electron
    if ((window as any).electronBridge) {
      checkUpdate();
      const interval = setInterval(checkUpdate, 30 * 60 * 1000); // 30 minutos
      return () => clearInterval(interval);
    }
  }, [notificationDismissed]);

  async function handleDownloadAndInstall() {
    setDownloadStatus({ downloading: true, progress: 0 });
    try {
      const result = await (window as any).electronBridge?.downloadAndInstall?.();
      if (result?.success) {
        setDownloadStatus({ downloading: false, progress: 100 });
        setShowNotification(false);
      } else {
        setDownloadStatus({ downloading: false, progress: 0, error: result?.error || 'Erro ao atualizar' });
      }
    } catch (err) {
      console.error('[UpdateChecker] erro ao baixar/instalar:', err);
      setDownloadStatus({ downloading: false, progress: 0, error: 'Erro de conexão' });
    }
  }

  function handleDismiss() {
    setShowNotification(false);
    setNotificationDismissed(true);
  }

  if (!updateStatus?.hasUpdate || !showNotification || downloadStatus.downloading) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Atualização disponível</h3>
            <p className="text-sm text-slate-600 mt-1">
              v{updateStatus.version} está disponível (você tem v{updateStatus.currentVersion})
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadStatus.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {downloadStatus.error}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDownloadAndInstall}
            disabled={downloadStatus.downloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {downloadStatus.downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Atualizar agora
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={downloadStatus.downloading}
            className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}
