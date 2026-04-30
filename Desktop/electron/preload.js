const { contextBridge, ipcRenderer } = require('electron');

// Expõe para o renderer de forma segura
contextBridge.exposeInMainWorld('electronBridge', {
  // Config da IA (Anthropic + Ollama)
  getAnthropicKey: () => ipcRenderer.invoke('config:getAnthropicKey'),
  setAnthropicKey: (key) => ipcRenderer.invoke('config:setAnthropicKey', key),
  getOpenAiKey: () => ipcRenderer.invoke('config:getOpenAiKey'),
  setOpenAiKey: (key) => ipcRenderer.invoke('config:setOpenAiKey', key),
  getOllamaModel: () => ipcRenderer.invoke('config:getOllamaModel'),
  setOllamaModel: (model) => ipcRenderer.invoke('config:setOllamaModel', model),
  checkOllama: () => ipcRenderer.invoke('config:checkOllama'),
  syncChatgptAgents: (payload) => ipcRenderer.invoke('agentes:syncChatgpt', payload),

  // Info da versão do app
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadAndInstall: () => ipcRenderer.invoke('updater:downloadAndInstall'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),

  // Eventos do updater (renderer escuta)
  onDownloadProgress: (cb) => {
    ipcRenderer.on('update:progress', (_e, info) => cb(info));
  },
  onUpdateDownloaded: (cb) => {
    ipcRenderer.on('update:downloaded', () => cb());
  },

  // Admin: criar usuário ao aprovar acesso
  criarUsuario: (dados) => ipcRenderer.invoke('admin:criarUsuario', dados),
});
