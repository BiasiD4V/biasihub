import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.biasi.hub',
  appName: 'BiasíHub',
  webDir: 'www',
  // Mantém o usuário online — Supabase precisa de internet de qualquer jeito.
  // O webview Android serve os arquivos locais (Hub, Almox, Comercial, Obras)
  // a partir de https://localhost (origem padrão do Capacitor).
  server: {
    androidScheme: 'https',
  },
  android: {
    // Se o backend Supabase mudar de https pra http, libera. Hoje é tudo https.
    allowMixedContent: false,
    // Desabilita captura de tela em telas sensíveis (login). Liga depois se quiser.
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
