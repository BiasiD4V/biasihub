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
    <div className="fixed bottom-8 right-8 z-[9999] animate-in slide-in-from-bottom-8 duration-500">
      <div className="premium-glass bg-white/20 border-2 border-white/20 p-6 w-[340px] rounded-[32px] shadow-2xl backdrop-blur-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 -translate-y-1/2 translate-x-1/2 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-4 mb-5 relative z-10">
          <div className="shrink-0">
            {phase === 'ready' ? (
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-500 animate-in zoom-in-50 duration-500">
                 <CheckCircle className="w-6 h-6" />
              </div>
            ) : phase === 'error' ? (
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-500">
                 <AlertCircle className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border-2 border-indigo-600/50 flex items-center justify-center text-indigo-400">
                 <RefreshCw className={`w-6 h-6 ${phase === 'downloading' ? 'animate-spin' : ''}`} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1.5">
              {phase === 'ready' ? 'Download Concluído' : phase === 'downloading' ? 'Sincronizando Nucleo' : 'Nova Versão Detectada'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed opacity-60">
              {phase === 'ready'
                ? 'Relatório: Instalação v' + updateStatus.version + ' pronta.'
                : `Protocolo: v${updateStatus.version} via rede distribuída.`}
            </p>
          </div>
          {phase === 'idle' && (
            <button onClick={handleDismiss} className="shrink-0 w-8 h-8 rounded-xl hover:bg-slate-900/5 flex items-center justify-center text-slate-400 transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar High Tech */}
        {phase === 'downloading' && (
          <div className="mb-5 relative z-10">
            <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
              <span>Transferindo Dados...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-900/5 overflow-hidden rounded-full h-2 border border-white/40">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Erro */}
        {phase === 'error' && errorMsg && (
          <div className="mb-5 p-3 premium-glass bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-600 uppercase tracking-widest animate-in zoom-in-95">
             Falha na Conexão: {errorMsg}
          </div>
        )}

        {/* Botões - Singularity Style */}
        <div className="flex gap-3 relative z-10">
          {phase === 'idle' && (
            <>
              <button
                onClick={handleStartDownload}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10"
              >
                <Download className="w-4 h-4" />
                Atualizar
              </button>
              <button
                onClick={handleDismiss}
                className="px-6 h-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors"
              >
                Adiar
              </button>
            </>
          )}

          {phase === 'ready' && (
            <button
              onClick={handleQuitAndInstall}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              Reiniciar Nucleo
            </button>
          )}

          {phase === 'error' && (
            <button
              onClick={handleStartDownload}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-600 transition-all shadow-xl"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
