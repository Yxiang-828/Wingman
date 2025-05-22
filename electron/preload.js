import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onMoodChange: (callback) => {
    ipcRenderer.on('mood-changed', (_, mood) => callback(mood));
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
});