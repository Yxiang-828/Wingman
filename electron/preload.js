const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // ✅ EXISTING METHODS (keep these)
  onMoodChange: (callback) => {
    ipcRenderer.on('mood-change', (_, mood) => callback(mood));
    // Return a cleanup function
    return () => {
      ipcRenderer.removeListener('mood-change', callback);
    };
  },
  
  toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),

  // ✅ NEW: DATABASE OPERATIONS
  db: {
    // TASK OPERATIONS
    getTasks: (userId, date) => ipcRenderer.invoke('db:getTasks', userId, date),
    saveTask: (task) => ipcRenderer.invoke('db:saveTask', task),
    updateTask: (id, updates) => ipcRenderer.invoke('db:updateTask', id, updates),
    deleteTask: (id) => ipcRenderer.invoke('db:deleteTask', id),

    // CALENDAR EVENT OPERATIONS
    getEvents: (userId, date) => ipcRenderer.invoke('db:getEvents', userId, date),
    saveEvent: (event) => ipcRenderer.invoke('db:saveEvent', event),
    deleteEvent: (id) => ipcRenderer.invoke('db:deleteEvent', id),

    // DIARY OPERATIONS
    getDiaryEntries: (userId, date) => ipcRenderer.invoke('db:getDiaryEntries', userId, date),
    saveDiaryEntry: (entry) => ipcRenderer.invoke('db:saveDiaryEntry', entry),

    // CHAT OPERATIONS (Perfect for Ollama!)
    getChatHistory: (userId, limit) => ipcRenderer.invoke('db:getChatHistory', userId, limit),
    saveChatMessage: (message, isAi, userId, sessionId) => ipcRenderer.invoke('db:saveChatMessage', message, isAi, userId, sessionId),
    clearChatHistory: (userId) => ipcRenderer.invoke('db:clearChatHistory', userId),

    // UTILITY OPERATIONS
    getStorageStats: (userId) => ipcRenderer.invoke('db:getStorageStats', userId)
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded - preload script running');
  console.log('✅ Database IPC methods exposed to renderer');
});