/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

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
  getOllamaModel: () => Promise<string>;
  setOllamaModel: (model: string) => Promise<boolean>;
  checkOllama: () => Promise<{ online: boolean; models: string[] }>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ hasUpdate: boolean; version?: string; currentVersion?: string; error?: string }>;
  downloadAndInstall: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstall: () => Promise<void>;
  onDownloadProgress: (cb: (info: { percent: number }) => void) => void;
  onUpdateDownloaded: (cb: () => void) => void;
  criarUsuario: (dados: Record<string, unknown>) => Promise<unknown>;
}

interface Window {
  electronBridge?: ElectronBridge;
}
