import { useEffect, useState } from 'react';
import { X, ArrowLeft, Sparkles, Download } from 'lucide-react';
import { isCapacitorRuntime } from '../../utils/runtime';

declare const __BUILD_VERSION__: string;

type Phase = 'idle' | 'downloading' | 'ready' | 'error';

const MOBILE_UPDATE_DISMISS_PREFIX = 'biasihub-mobile-update-dismissed:';

function normalizeVersionTag(tag?: string | null) {
  return String(tag || '').trim().replace(/^v/i, '');
}

function isNewerVersion(latestTag: string, currentTag: string) {
  const normalizedLatest = normalizeVersionTag(latestTag);
  const normalizedCurrent = normalizeVersionTag(currentTag);
  if (!normalizedLatest) return false;
  if (!normalizedCurrent || normalizedCurrent === 'dev') return true;
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
  const [versaoNova, setVersaoNova] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [dispensado, setDispensado] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const bridge = (window as any).electronBridge;
  const isDesktop = !!bridge;
  const isCapacitor = isCapacitorRuntime();
  const mobileCurrentVersion = normalizeVersionTag(import.meta.env.VITE_MOBILE_RELEASE_TAG || '');

  useEffect(() => {
    let cancelado = false;

    async function verificar() {
      if (isDesktop) {
        try {
          const resultado = await bridge.checkForUpdates?.();
          if (!cancelado && resultado?.hasUpdate) {
            setVersaoNova(resultado.version ?? 'nova');
          }
        } catch {
          // ignora
        }
        return;
      }

      if (isCapacitor) {
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
            setVersaoNova(latestTag);
            setDownloadUrl(apkAsset.browser_download_url);
          }
        } catch {
          // ignora
        }
        return;
      }

      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok || cancelado) return;
        const data = await res.json();
        const current = __BUILD_VERSION__;
        if (data.v && data.v !== current) setVersaoNova(data.v);
      } catch {
        // ignora
      }
    }

    const t = setTimeout(verificar, 20000);
    const iv = setInterval(verificar, 5 * 60 * 1000);
    return () => {
      cancelado = true;
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [bridge, isDesktop, isCapacitor, mobileCurrentVersion]);

  async function instalarApk() {
    if (!downloadUrl) return;
    setPhase('downloading');
    setErrorMsg('');
    try {
      const nativeInstaller = (window as any).BiasiApkInstaller;
      const fileName = downloadUrl.split('/').pop() || `biasihub-mobile-v${versaoNova}.apk`;
      if (nativeInstaller?.installApk) {
        nativeInstaller.installApk(downloadUrl, fileName);
        setPhase('ready');
      } else {
        // Fallback: abre direto (Chrome vai baixar o APK)
        window.location.href = downloadUrl;
        setPhase('ready');
      }
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e?.message || 'Nao foi possivel iniciar a instalacao.');
    }
  }

  function dispensar() {
    if (isCapacitor && versaoNova) rememberMobileUpdateDismissed(versaoNova);
    setDispensado(true);
    setPhase('idle');
  }

  if (!versaoNova || dispensado) return null;

  if (isCapacitor) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <Download size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-slate-800 text-sm">
              {phase === 'downloading' ? 'Baixando APK...' : phase === 'ready' ? 'Instalador aberto' : 'Atualizacao disponivel'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {phase === 'ready'
                ? 'Conclua a instalacao na tela do Android. Se pedir permissao, autorize e toque novamente.'
                : `Versao v${versaoNova}. Instala direto no app, sem abrir o Chrome.`}
            </p>
            {phase === 'error' && errorMsg && (
              <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
            )}
          </div>
          <button onClick={dispensar} className="text-slate-300 hover:text-slate-500">
            <X size={15} />
          </button>
        </div>
        <button
          onClick={phase === 'ready' ? instalarApk : instalarApk}
          disabled={phase === 'downloading'}
          className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download size={13} className={phase === 'downloading' ? 'animate-pulse' : ''} />
          {phase === 'downloading' ? 'Baixando...' : phase === 'ready' ? 'Abrir instalador novamente' : 'Instalar agora'}
        </button>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-indigo-600 text-white text-xs font-medium flex-shrink-0">
        <Sparkles size={13} className="flex-shrink-0 opacity-80" />
        <span className="flex-1">
          Nova versao <strong>v{versaoNova}</strong> disponivel - volte ao Hub para atualizar.
        </span>
        <button
          onClick={() => { window.location.href = 'app://hub.local/'; }}
          className="flex items-center gap-1 px-2.5 py-1 bg-white text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <ArrowLeft size={11} /> Ir para o Hub
        </button>
        <button onClick={() => setDispensado(true)} className="p-0.5 opacity-60 hover:opacity-100 transition-opacity">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <Sparkles size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">Atualizacao disponivel</p>
          <p className="text-xs text-slate-500 mt-0.5">Recarregue para usar a versao mais recente.</p>
        </div>
        <button onClick={() => setDispensado(true)} className="text-slate-300 hover:text-slate-500">
          <X size={15} />
        </button>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Atualizar agora
      </button>
    </div>
  );
}
