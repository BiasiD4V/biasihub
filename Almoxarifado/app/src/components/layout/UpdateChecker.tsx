import { useEffect, useState } from 'react';
import { X, ArrowLeft, Sparkles, Download } from 'lucide-react';

declare const __BUILD_VERSION__: string;

function isNewerVersion(latestTag: string, currentTag: string) {
  if (!latestTag) return false;
  if (!currentTag || currentTag === 'dev') return true;
  const latest = latestTag.replace(/^v/, '').split('.').map((n) => Number(n) || 0);
  const current = currentTag.replace(/^v/, '').split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(latest.length, current.length); i++) {
    if ((latest[i] || 0) > (current[i] || 0)) return true;
    if ((latest[i] || 0) < (current[i] || 0)) return false;
  }
  return false;
}

export function UpdateChecker() {
  const [versaoNova, setVersaoNova] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [dispensado, setDispensado] = useState(false);

  const bridge = (window as any).electronBridge;
  const isDesktop = !!bridge;
  const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor;
  const mobileCurrentVersion = (import.meta.env.VITE_MOBILE_RELEASE_TAG || 'dev').replace(/^v/, '');

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
          const latestTag = String(release.tag_name || '').replace(/^v/, '');
          const apkAsset = (release.assets || []).find((asset: any) =>
            String(asset.name || '').toLowerCase().endsWith('.apk')
          );
          if (latestTag && apkAsset?.browser_download_url && isNewerVersion(latestTag, mobileCurrentVersion)) {
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

  async function baixarApk() {
    if (!downloadUrl) return;
    try {
      const browser = (window as any).Capacitor?.Plugins?.Browser;
      if (browser?.open) {
        await browser.open({ url: downloadUrl });
      } else {
        window.open(downloadUrl, '_blank');
      }
    } catch {
      window.location.href = downloadUrl;
    }
  }

  if (!versaoNova || dispensado) return null;

  if (isCapacitor) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <Download size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-slate-800 text-sm">Atualizacao do APK disponivel</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Versao v{versaoNova}. Baixe o APK da release e instale por cima.
            </p>
          </div>
          <button onClick={() => setDispensado(true)} className="text-slate-300 hover:text-slate-500">
            <X size={15} />
          </button>
        </div>
        <button
          onClick={baixarApk}
          className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Baixar APK
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
