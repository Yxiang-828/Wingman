// preload.js
// This file is executed in the renderer process before web content begins loading
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onMoodChange: (callback) => ipcRenderer.on('mood-changed', (_, mood) => callback(mood)),
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
});