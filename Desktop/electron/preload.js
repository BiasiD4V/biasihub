const { contextBridge, ipcRenderer } = require('electron');

// Expõe para o renderer de forma segura
contextBridge.exposeInMainWorld('electronBridge', {
  // Config da chave da IA
  getAnthropicKey: () => ipcRenderer.invoke('config:getAnthropicKey'),
  setAnthropicKey: (key) => ipcRenderer.invoke('config:setAnthropicKey', key),

  // Info da versão do app
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
});
