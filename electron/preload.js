const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ✅ COMPLETE DATABASE API
  db: {
    // ═══════════════════════════════════════════════════════════════
    // 🎯 **TASK OPERATIONS**
    // ═══════════════════════════════════════════════════════════════
    getTasks: (userId, date) => 
      ipcRenderer.invoke('db:getTasks', userId, date),
    saveTask: (task) => 
      ipcRenderer.invoke('db:saveTask', task),
    updateTask: (id, updates) => 
      ipcRenderer.invoke('db:updateTask', id, updates),
    deleteTask: (id) => 
      ipcRenderer.invoke('db:deleteTask', id),

    // ═══════════════════════════════════════════════════════════════
    // 🎯 **EVENT OPERATIONS**
    // ═══════════════════════════════════════════════════════════════
    getEvents: (userId, date) => 
      ipcRenderer.invoke('db:getEvents', userId, date),
    saveEvent: (event) => 
      ipcRenderer.invoke('db:saveEvent', event),
    updateEvent: (event) => 
      ipcRenderer.invoke('db:updateEvent', event),
    deleteEvent: (id) => 
      ipcRenderer.invoke('db:deleteEvent', id),

    // ═══════════════════════════════════════════════════════════════
    // 🎯 **DIARY OPERATIONS**
    // ═══════════════════════════════════════════════════════════════
    getDiaryEntries: (userId, date) => 
      ipcRenderer.invoke('db:getDiaryEntries', userId, date),
    saveDiaryEntry: (entry) => 
      ipcRenderer.invoke('db:saveDiaryEntry', entry),
    deleteDiaryEntry: (id) => ipcRenderer.invoke('db:deleteDiaryEntry', id),
    // ═══════════════════════════════════════════════════════════════
    // 🎯 **CHAT OPERATIONS**
    // ═══════════════════════════════════════════════════════════════
    getChatHistory: (userId, limit) => 
      ipcRenderer.invoke('db:getChatHistory', userId, limit),
    saveChatMessage: (message, isAi, userId, sessionId) => 
      ipcRenderer.invoke('db:saveChatMessage', message, isAi, userId, sessionId),
    clearChatHistory: (userId) => 
      ipcRenderer.invoke('db:clearChatHistory', userId),

    // ✅ NEW: Quick Prompts operations
    getQuickPrompts: (userId) => 
      ipcRenderer.invoke('db:getQuickPrompts', userId),
    saveQuickPrompt: (userId, promptText) => 
      ipcRenderer.invoke('db:saveQuickPrompt', userId, promptText),
    deleteQuickPrompt: (promptId) => 
      ipcRenderer.invoke('db:deleteQuickPrompt', promptId),
    updateQuickPromptUsage: (promptId) => 
      ipcRenderer.invoke('db:updateQuickPromptUsage', promptId),

    // ✅ NEW: Settings persistence
    saveUserSettings: (userId, settings) => 
      ipcRenderer.invoke('db:saveUserSettings', userId, settings),
    getUserSettings: (userId) => 
      ipcRenderer.invoke('db:getUserSettings', userId),

    // ✅ NEW: Model Download operations
    getDownloadedModels: (userId) => 
      ipcRenderer.invoke('db:getDownloadedModels', userId),
    saveDownloadedModel: (userId, modelData) => 
      ipcRenderer.invoke('db:saveDownloadedModel', userId, modelData),
    deleteDownloadedModel: (userId, modelName) => 
      ipcRenderer.invoke('db:deleteDownloadedModel', userId, modelName),

    // ═══════════════════════════════════════════════════════════════
    // 🎯 **UTILITY OPERATIONS**
    // ═══════════════════════════════════════════════════════════════
    getStorageStats: (userId) => 
      ipcRenderer.invoke('db:getStorageStats', userId)
  },

  // ✅ SYSTEM OPERATIONS
  system: {
    toggleDevTools: () => ipcRenderer.send('toggle-dev-tools'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getVersion: () => ipcRenderer.invoke('get-version'),
    getPlatform: () => process.platform,
    isDevMode: () => process.env.NODE_ENV === 'development'
  },

  // ✅ FILE OPERATIONS (if needed)
  files: {
    selectFile: (options) => ipcRenderer.invoke('select-file', options),
    saveFile: (options) => ipcRenderer.invoke('save-file', options),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data)
  },

  // ✅ ADD: GPU information
  gpu: {
    getInfo: () => ipcRenderer.invoke('get-gpu-info'),
  },

  // ✅ NOTIFICATION OPERATIONS
  notifications: {
    showImmediate: (options) => ipcRenderer.invoke('notifications:showImmediate', options),
    requestPermission: () => ipcRenderer.invoke('notifications:requestPermission'),
    scheduleReminder: (options) => ipcRenderer.invoke('notifications:scheduleReminder', options),
    cancelNotification: (id) => ipcRenderer.invoke('notifications:cancel', id)
  },

  // ✅ USER MANAGEMENT OPERATIONS
  user: {
    storeActiveUser: (userId) => ipcRenderer.invoke('store-active-user', userId)
  }
});

// ✅ SECURITY: Remove any node integration
delete window.require;
delete window.exports;
delete window.module;

console.log('✅ Preload script loaded successfully');
console.log('✅ ElectronAPI exposed to renderer:', Object.keys(window.electronAPI || {}));