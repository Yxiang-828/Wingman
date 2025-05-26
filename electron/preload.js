const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onMoodChange: (callback) => {
    ipcRenderer.on('mood-change', (_, mood) => callback(mood));
    // Return a cleanup function
    return () => {
      ipcRenderer.removeListener('mood-change', callback);
    };
  },
  
  toggleDevTools: () => ipcRenderer.send('toggle-dev-tools')
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded - preload script running');
});