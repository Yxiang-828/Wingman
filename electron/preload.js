const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onMoodChange: (callback) => {
    ipcRenderer.on('mood-changed', (_, mood) => callback(mood));
    // Return a cleanup function
    return () => {
      ipcRenderer.removeListener('mood-changed', callback);
    };
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded - preload script running');
});