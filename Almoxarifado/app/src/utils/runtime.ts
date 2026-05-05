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
let heartbeatTimer: number | undefined;
let recoveryRunning = false;
let lastRecoveryAt = 0;
let lastVisibleAt = Date.now();

// Timeout generoso: 8s pro auth (APK 4G pode ser lento)
const RECOVERY_AUTH_TIMEOUT_MS = 8000;

// Heartbeat a cada 45s — detecta quedas silenciosas (Electron sleep, APK background)
const HEARTBEAT_INTERVAL_MS = 45_000;

// Cooldown entre recuperações: 5s (era 15s — muito longo)
const RECOVERY_COOLDOWN_MS = 5_000;

function withRecoveryTimeout<T>(promise: Promise<T> | undefined): Promise<T | undefined> {
  if (!promise) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(undefined), RECOVERY_AUTH_TIMEOUT_MS);

    promise
      .then((result) => resolve(result))
      .catch(() => resolve(undefined))
      .finally(() => window.clearTimeout(timer));
  });
}

export function installConnectionRecovery(supabase: RecoverableSupabaseClient) {
  if (typeof window === 'undefined') return;
  if (connectionRecoveryInstalled) return;

  connectionRecoveryInstalled = true;

  const recover = async (reason: string) => {
    if (recoveryRunning) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const now = Date.now();
    // 'online' e 'heartbeat' nunca respeitam cooldown — prioridade máxima
    const bypassCooldown = reason === 'online' || reason === 'heartbeat';
    if (!bypassCooldown && now - lastRecoveryAt < RECOVERY_COOLDOWN_MS) return;

    recoveryRunning = true;
    lastRecoveryAt = now;

    try {
      const sessionResult = await withRecoveryTimeout(supabase.auth?.getSession?.());

      if (sessionResult?.data?.session) {
        await withRecoveryTimeout(supabase.auth?.refreshSession?.().catch(() => null));
      }
    } catch {
      // silencioso — não interrompe o fluxo
    }

    try {
      supabase.realtime?.disconnect?.();
      // Pequeno delay antes de reconectar para o WebSocket fechar limpo
      await new Promise<void>((r) => window.setTimeout(r, 300));
      supabase.realtime?.connect?.();
    } catch {
      // silencioso
    } finally {
      window.dispatchEvent(new CustomEvent('biasi:connection-restored', { detail: { reason } }));
      recoveryRunning = false;
    }
  };

  const scheduleRecovery = (reason: string, delayMs = 600) => {
    if (recoveryTimer) window.clearTimeout(recoveryTimer);
    recoveryTimer = window.setTimeout(() => {
      void recover(reason);
    }, delayMs);
  };

  // Eventos de rede e foco
  window.addEventListener('online', () => scheduleRecovery('online', 300));
  window.addEventListener('focus', () => scheduleRecovery('focus'));
  window.addEventListener('pageshow', () => scheduleRecovery('pageshow'));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Se ficou oculto por mais de 2 minutos, recupera imediatamente
      const hiddenMs = Date.now() - lastVisibleAt;
      const delay = hiddenMs > 120_000 ? 300 : 600;
      scheduleRecovery('visible', delay);
    } else {
      lastVisibleAt = Date.now();
    }
  });

  // Heartbeat periódico — principal proteção contra quedas silenciosas
  // (Electron ao acordar do sono, APK em background não dispara eventos de rede)
  heartbeatTimer = window.setInterval(async () => {
    if (document.hidden) return; // não bate enquanto app está em background
    if (navigator.onLine === false) return;

    try {
      const result = await withRecoveryTimeout(supabase.auth?.getSession?.());
      if (!result?.data?.session) {
        // Sem sessão — pode ser queda silenciosa, tenta recuperar
        scheduleRecovery('heartbeat', 0);
      }
    } catch {
      scheduleRecovery('heartbeat', 0);
    }
  }, HEARTBEAT_INTERVAL_MS);
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
