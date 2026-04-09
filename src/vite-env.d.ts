/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __BUILD_VERSION__: string;

interface ElectronBridge {
  getAnthropicKey: () => Promise<string>;
  setAnthropicKey: (key: string) => Promise<boolean>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ hasUpdate: boolean; version?: string; error?: string }>;
  downloadAndInstall: () => Promise<{ success: boolean; error?: string }>;
}

interface Window {
  electronBridge?: ElectronBridge;
}
