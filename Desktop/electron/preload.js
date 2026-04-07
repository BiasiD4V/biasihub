const { contextBridge, ipcRenderer } = require('electron');

// Expõe para o renderer de forma segura
contextBridge.exposeInMainWorld('electronBridge', {
  // Config da chave da IA
  getAnthropicKey: () => ipcRenderer.invoke('config:getAnthropicKey'),
  setAnthropicKey: (key) => ipcRenderer.invoke('config:setAnthropicKey', key),

  // Info da versão do app
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadAndInstall: () => ipcRenderer.invoke('updater:downloadAndInstall'),
});
