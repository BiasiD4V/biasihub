export function isCapacitorRuntime() {
  if (typeof window === 'undefined') return false;

  const w = window as any;
  return Boolean(
    w.Capacitor ||
      window.location.protocol === 'capacitor:' ||
      window.location.origin === 'https://localhost' ||
      navigator.userAgent.includes('Capacitor')
  );
}

export function isElectronRuntime() {
  if (typeof window === 'undefined') return false;

  return window.location.protocol === 'app:' || navigator.userAgent.includes('Electron');
}

type RecoverableSupabaseClient = {
  auth?: {
    getSession?: () => Promise<{ data?: { session?: unknown } }>;
    refreshSession?: () => Promise<unknown>;
  };
  realtime?: {
    disconnect?: () => void;
    connect?: () => void;
  };
};

let connectionRecoveryInstalled = false;
let recoveryTimer: number | undefined;
let recoveryRunning = false;
let lastRecoveryAt = 0;
const RECOVERY_AUTH_TIMEOUT_MS = 5000;

function withRecoveryTimeout<T>(promise: Promise<T> | undefined): Promise<T | undefined> {
  if (!promise) return Promise.resolve(undefined);

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => resolve(undefined), RECOVERY_AUTH_TIMEOUT_MS);

    promise
      .then((result) => resolve(result))
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
}

export function installConnectionRecovery(supabase: RecoverableSupabaseClient) {
  if (typeof window === 'undefined') return;
  if (!isCapacitorRuntime() && !isElectronRuntime()) return;
  if (connectionRecoveryInstalled) return;

  connectionRecoveryInstalled = true;

  const recover = async (reason: string) => {
    if (recoveryRunning) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const now = Date.now();
    if (reason !== 'online' && now - lastRecoveryAt < 15000) return;

    recoveryRunning = true;
    lastRecoveryAt = now;

    try {
      const sessionResult = await withRecoveryTimeout(supabase.auth?.getSession?.());

      if (sessionResult?.data?.session) {
        await withRecoveryTimeout(supabase.auth?.refreshSession?.().catch(() => null));
      }
    } catch (error) {
      console.warn('[runtime] Falha ao renovar sessao durante recuperacao.', error);
    }

    try {
      supabase.realtime?.disconnect?.();
      supabase.realtime?.connect?.();
    } catch (error) {
      console.warn('[runtime] Falha ao reconectar realtime durante recuperacao.', error);
    } finally {
      window.dispatchEvent(new CustomEvent('biasi:connection-restored', { detail: { reason } }));
      recoveryRunning = false;
    }
  };

  const scheduleRecovery = (reason: string) => {
    if (recoveryTimer) window.clearTimeout(recoveryTimer);
    recoveryTimer = window.setTimeout(() => {
      void recover(reason);
    }, 600);
  };

  window.addEventListener('online', () => scheduleRecovery('online'));
  window.addEventListener('focus', () => scheduleRecovery('focus'));
  window.addEventListener('pageshow', () => scheduleRecovery('pageshow'));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleRecovery('visible');
  });
}

export async function purgeMobileWebCaches() {
  if (!isCapacitorRuntime() || typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Cache antigo nunca deve bloquear a navegacao local do APK.
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Silencioso: o WebView pode negar acesso dependendo da versao.
  }
}
