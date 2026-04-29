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
