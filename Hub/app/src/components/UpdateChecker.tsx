import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Download, RefreshCw, X } from 'lucide-react';
import { isCapacitorRuntime } from '../utils/runtime';

interface UpdateStatus {
  hasUpdate: boolean;
  version: string | null;
  currentVersion: string;
  downloadUrl?: string;
  error?: string;
}

type Phase = 'idle' | 'downloading' | 'ready' | 'error';

const MOBILE_UPDATE_DISMISS_PREFIX = 'biasihub-mobile-update-dismissed:';

function normalizeVersionTag(tag?: string | null) {
  return String(tag || '').trim().replace(/^v/i, '');
}

function isNewerVersion(latestTag: string, currentTag: string) {
  const normalizedLatest = normalizeVersionTag(latestTag);
  const normalizedCurrent = normalizeVersionTag(currentTag);
  if (!normalizedLatest) return false;
  if (!normalizedCurrent || normalizedCurrent === 'dev') return false;
  const latest = normalizedLatest.split('.').map((n) => Number(n) || 0);
  const current = normalizedCurrent.split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(latest.length, current.length); i++) {
    if ((latest[i] || 0) > (current[i] || 0)) return true;
    if ((latest[i] || 0) < (current[i] || 0)) return false;
  }
  return false;
}

function getMobileDismissKey(version?: string | null) {
  const normalized = normalizeVersionTag(version);
  return normalized ? `${MOBILE_UPDATE_DISMISS_PREFIX}${normalized}` : '';
}

function wasMobileUpdateDismissed(version?: string | null) {
  try {
    const key = getMobileDismissKey(version);
    return Boolean(key && window.localStorage.getItem(key) === '1');
  } catch {
    return false;
  }
}

function rememberMobileUpdateDismissed(version?: string | null) {
  try {
    const key = getMobileDismissKey(version);
    if (key) window.localStorage.setItem(key, '1');
  } catch {
    // Ignora ambientes sem localStorage persistente.
  }
}

export function UpdateChecker() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const bridge = (window as any).electronBridge;
  const isCapacitor = isCapacitorRuntime();
  const mobileCurrentVersion = normalizeVersionTag(import.meta.env.VITE_MOBILE_RELEASE_TAG || '');

  useEffect(() => {
    if (isCapacitor) {
      let cancelado = false;

      async function checkMobileRelease() {
        try {
          const res = await fetch('https://api.github.com/repos/BiasiD4V/biasihub/releases/latest', { cache: 'no-store' });
          if (!res.ok || cancelado) return;
          const release = await res.json();
          const latestTag = normalizeVersionTag(release.tag_name);
          const apkAsset = (release.assets || []).find((asset: any) =>
            String(asset.name || '').toLowerCase().endsWith('.apk')
          );
          if (latestTag && apkAsset?.browser_download_url && isNewerVersion(latestTag, mobileCurrentVersion)) {
            if (wasMobileUpdateDismissed(latestTag)) return;
            setUpdateStatus({
              hasUpdate: true,
              version: latestTag,
              currentVersion: mobileCurrentVersion,
              downloadUrl: apkAsset.browser_download_url,
            });
            if (!dismissed) setShowNotification(true);
          }
        } catch (e) {
          console.error('[UpdateChecker mobile] erro ao verificar release:', e);
        }
      }

      checkMobileRelease();
      const t = setInterval(checkMobileRelease, 30 * 60 * 1000);
      return () => {
        cancelado = true;
        clearInterval(t);
      };
    }

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
  }, [bridge, dismissed, isCapacitor, mobileCurrentVersion]);

  useEffect(() => {
    if (!bridge) return;

    bridge.onDownloadProgress?.((info: { percent: number }) => {
      setProgress(info.percent);
    });

    bridge.onUpdateDownloaded?.(() => {
      setPhase('ready');
      setProgress(100);
    });
  }, [bridge]);

  async function handleStartDownload() {
    if (isCapacitor && updateStatus?.downloadUrl) {
      setPhase('downloading');
      setErrorMsg('');
      try {
        const nativeInstaller = (window as any).BiasiApkInstaller;
        const fileName = updateStatus.downloadUrl.split('/').pop() || `biasihub-mobile-v${updateStatus.version}.apk`;

        if (nativeInstaller?.installApk) {
          nativeInstaller.installApk(updateStatus.downloadUrl, fileName);
          setPhase('ready');
        } else {
          window.location.href = updateStatus.downloadUrl;
          setPhase('ready');
        }
      } catch (e: any) {
        setPhase('error');
        setErrorMsg(e?.message || 'Nao foi possivel iniciar a instalacao.');
      }
      return;
    }

    setPhase('downloading');
    setProgress(0);
    setErrorMsg('');
    try {
      const result = await bridge?.downloadAndInstall?.();
      if (!result?.success) {
        setPhase('error');
        setErrorMsg(result?.error || 'Erro ao iniciar download');
      }
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e?.message || 'Erro de conexao');
    }
  }

  function handleQuitAndInstall() {
    bridge?.quitAndInstall?.();
  }

  function handleDismiss() {
    if (isCapacitor && updateStatus?.version) {
      rememberMobileUpdateDismissed(updateStatus.version);
    }
    setShowNotification(false);
    setDismissed(true);
  }

  if (!updateStatus?.hasUpdate || (!showNotification && phase !== 'ready')) return null;

  if (isCapacitor) {
    return (
      <div className="fixed bottom-5 left-4 right-4 z-[9999] animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-white border-2 border-indigo-100 p-4 rounded-[24px] shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {phase === 'downloading' ? 'Baixando APK' : phase === 'ready' ? 'Instalador aberto' : 'Atualizacao do APK'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {phase === 'ready'
                  ? 'Conclua a instalacao na tela do Android. Se o sistema pedir permissao, autorize e toque novamente aqui.'
                  : `Nova versao v${updateStatus.version} disponivel. Instale pelo proprio app, sem abrir o Chrome.`}
              </p>
            </div>
            <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleStartDownload}
            disabled={phase === 'downloading'}
            className="mt-3 w-full h-11 flex items-center justify-center gap-2 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.18em] rounded-2xl"
          >
            <Download className={`w-4 h-4 ${phase === 'downloading' ? 'animate-pulse' : ''}`} />
            {phase === 'downloading' ? 'Baixando...' : phase === 'ready' ? 'Abrir instalador novamente' : 'Instalar agora'}
          </button>
          {phase === 'error' && errorMsg && (
            <p className="mt-2 text-[11px] font-bold text-rose-600">{errorMsg}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-[9999] animate-in slide-in-from-bottom-8 duration-500">
      <div className="premium-glass bg-white/20 border-2 border-white/20 p-6 w-[340px] rounded-[32px] shadow-2xl backdrop-blur-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 -translate-y-1/2 translate-x-1/2 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-4 mb-5 relative z-10">
          <div className="shrink-0">
            {phase === 'ready' ? (
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-500">
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
              {phase === 'ready' ? 'Download concluido' : phase === 'downloading' ? 'Baixando atualizacao' : 'Nova versao detectada'}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed opacity-60">
              {phase === 'ready'
                ? `Instalacao v${updateStatus.version} pronta.`
                : `Versao v${updateStatus.version} disponivel.`}
            </p>
          </div>
          {phase === 'idle' && (
            <button onClick={handleDismiss} className="shrink-0 w-8 h-8 rounded-xl hover:bg-slate-900/5 flex items-center justify-center text-slate-400 transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {phase === 'downloading' && (
          <div className="mb-5 relative z-10">
            <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
              <span>Transferindo...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-900/5 overflow-hidden rounded-full h-2 border border-white/40">
              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {phase === 'error' && errorMsg && (
          <div className="mb-5 p-3 bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-600 uppercase tracking-widest">
            Falha na conexao: {errorMsg}
          </div>
        )}

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
              Reiniciar
            </button>
          )}

          {phase === 'error' && (
            <button
              onClick={handleStartDownload}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-600 transition-all shadow-xl"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
