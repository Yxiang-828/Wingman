// preload.js
// This file is executed in the renderer process before web content begins loading
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,  // This flag is crucial for proper API URL detection
  onMoodChange: (callback) => ipcRenderer.on('mood-changed', (_, mood) => callback(mood))
});

// Anything else you want to expose to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  onMoodChange: (callback) => ipcRenderer.on('mood-changed', (_, mood) => callback(mood)),
  setMaxMoodListeners: (count) => ipcRenderer.setMaxListeners(count),
  // Add this to help debug API URL issues
  getElectronInfo: () => ({
    isElectron: true,
    platform: process.platform,
    version: process.versions.electron
  })
});

console.log("Preload script executed - Electron environment variables set");

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded in Electron context');
  
  // Help debug API connection issues
  setTimeout(() => {
    // Add retry mechanism for backend health check
    let retryCount = 0;
    const maxRetries = 3;
    
    const checkBackendHealth = () => {
      fetch('http://localhost:8000/health')
        .then(response => response.json())
        .then(data => {
          console.log('Backend health check:', data);
          // Add a visual indicator in the app
          const statusDiv = document.createElement('div');
          statusDiv.style.position = 'fixed';
          statusDiv.style.bottom = '5px';
          statusDiv.style.left = '5px';
          statusDiv.style.background = 'green';
          statusDiv.style.color = 'white';
          statusDiv.style.padding = '5px';
          statusDiv.style.borderRadius = '3px';
          statusDiv.style.fontSize = '10px';
          statusDiv.style.zIndex = '9999';
          statusDiv.textContent = '✓ Backend Connected';
          document.body.appendChild(statusDiv);
        })
        .catch(err => {
          console.error('Backend health check failed:', err);
          
          // Retry logic
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying backend connection (${retryCount}/${maxRetries})...`);
            setTimeout(checkBackendHealth, 2000); // Wait 2 seconds before retry
          } else {
            // Show error indicator after all retries fail
            const statusDiv = document.createElement('div');
            statusDiv.style.position = 'fixed';
            statusDiv.style.bottom = '5px';
            statusDiv.style.left = '5px';
            statusDiv.style.background = 'red';
            statusDiv.style.color = 'white';
            statusDiv.style.padding = '5px';
            statusDiv.style.borderRadius = '3px';
            statusDiv.style.fontSize = '10px';
            statusDiv.style.zIndex = '9999';
            statusDiv.textContent = '✗ Backend Error';
            document.body.appendChild(statusDiv);
          }
        });
    };
    
    // Start the initial check
    checkBackendHealth();
  }, 3000);
});