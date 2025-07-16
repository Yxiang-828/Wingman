const { contextBridge, ipcRenderer } = require("electron");

// Expose APIs to renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // All database APIs
  db: {
    // ═══════════════════════════════════════════════════════════════
    // TASK OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    getTasks: (userId, date) => ipcRenderer.invoke("db:getTasks", userId, date),
    getAllTasks: (userId) => ipcRenderer.invoke("db:getAllTasks", userId),
    saveTask: (task) => ipcRenderer.invoke("db:saveTask", task),
    updateTask: (id, updates) =>
      ipcRenderer.invoke("db:updateTask", id, updates),
    deleteTask: (id) => ipcRenderer.invoke("db:deleteTask", id),

    // ═══════════════════════════════════════════════════════════════
    // RECURRING TASK OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    saveRecurringTask: (recurringTask) =>
      ipcRenderer.invoke("db:saveRecurringTask", recurringTask),
    getRecurringTasks: (userId) =>
      ipcRenderer.invoke("db:getRecurringTasks", userId),
    updateRecurringTask: (id, updates) =>
      ipcRenderer.invoke("db:updateRecurringTask", id, updates),
    deleteRecurringTask: (id) =>
      ipcRenderer.invoke("db:deleteRecurringTask", id),
    generateRecurringTasks: (userId, targetDate) =>
      ipcRenderer.invoke("db:generateRecurringTasks", userId, targetDate),
    handleRecurringTaskCompletion: (taskId) =>
      ipcRenderer.invoke("db:handleRecurringTaskCompletion", taskId),

    // ═══════════════════════════════════════════════════════════════
    // EVENT OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    getEvents: (userId, date) =>
      ipcRenderer.invoke("db:getEvents", userId, date),
    getAllEvents: (userId) => ipcRenderer.invoke("db:getAllEvents", userId),
    saveEvent: (event) => ipcRenderer.invoke("db:saveEvent", event),
    updateEvent: (event) => ipcRenderer.invoke("db:updateEvent", event),
    deleteEvent: (id) => ipcRenderer.invoke("db:deleteEvent", id),

    // ═══════════════════════════════════════════════════════════════
    // DIARY OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    getDiaryEntries: (userId, date) =>
      ipcRenderer.invoke("db:getDiaryEntries", userId, date),
    getAllDiaryEntries: (userId) =>
      ipcRenderer.invoke("db:getAllDiaryEntries", userId),
    saveDiaryEntry: (entry) => ipcRenderer.invoke("db:saveDiaryEntry", entry),
    deleteDiaryEntry: (id) => ipcRenderer.invoke("db:deleteDiaryEntry", id),
    // ═══════════════════════════════════════════════════════════════
    // CHAT OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    getChatHistory: (userId, limit) =>
      ipcRenderer.invoke("db:getChatHistory", userId, limit),
    saveChatMessage: (message, isAi, userId, sessionId) =>
      ipcRenderer.invoke(
        "db:saveChatMessage",
        message,
        isAi,
        userId,
        sessionId,
      ),
    clearChatHistory: (userId) =>
      ipcRenderer.invoke("db:clearChatHistory", userId),

    // Quick Prompts operations
    getQuickPrompts: (userId) =>
      ipcRenderer.invoke("db:getQuickPrompts", userId),
    saveQuickPrompt: (userId, promptText) =>
      ipcRenderer.invoke("db:saveQuickPrompt", userId, promptText),
    deleteQuickPrompt: (promptId) =>
      ipcRenderer.invoke("db:deleteQuickPrompt", promptId),
    updateQuickPromptUsage: (promptId) =>
      ipcRenderer.invoke("db:updateQuickPromptUsage", promptId),

    // Settings persistence
    saveUserSettings: (userId, settings) =>
      ipcRenderer.invoke("db:saveUserSettings", userId, settings),
    getUserSettings: (userId) =>
      ipcRenderer.invoke("db:getUserSettings", userId),

    // ═══════════════════════════════════════════════════════════════
    // USER AUTHENTICATION OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    storeUserCredentials: (userId, userData) =>
      ipcRenderer.invoke("db:storeUserCredentials", userId, userData),
    getUserCredentials: (username, password) =>
      ipcRenderer.invoke("db:getUserCredentials", username, password),
    userNeedsSync: (userId) => ipcRenderer.invoke("db:userNeedsSync", userId),
    markUserSynced: (userId) => ipcRenderer.invoke("db:markUserSynced", userId),
    getCurrentUser: () => ipcRenderer.invoke("db:getCurrentUser"),
    getUserById: (userId) => ipcRenderer.invoke("db:getUserById", userId),
    clearUserCredentials: () => ipcRenderer.invoke("db:clearUserCredentials"),
    usernameExistsLocally: (username) =>
      ipcRenderer.invoke("db:usernameExistsLocally", username),

    // Model Download operations
    getDownloadedModels: (userId) =>
      ipcRenderer.invoke("db:getDownloadedModels", userId),
    saveDownloadedModel: (userId, modelData) =>
      ipcRenderer.invoke("db:saveDownloadedModel", userId, modelData),
    deleteDownloadedModel: (userId, modelName) =>
      ipcRenderer.invoke("db:deleteDownloadedModel", userId, modelName),

    // ═══════════════════════════════════════════════════════════════
    // UTILITY OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    getStorageStats: (userId) =>
      ipcRenderer.invoke("db:getStorageStats", userId),
  },

  // General system operations that don't fit into the database category
  system: {
    toggleDevTools: () => ipcRenderer.send("toggle-dev-tools"),
    openExternal: (url) => ipcRenderer.invoke("open-external", url),
    getVersion: () => ipcRenderer.invoke("get-version"),
    getPlatform: () => process.platform,
    isDevMode: () => process.env.NODE_ENV === "development",
  },

  // Custom dialog operations to avoid native dialog focus issues
  dialogs: {
    confirm: (message) => ipcRenderer.invoke("dialog:confirm", message),
    alert: (message) => ipcRenderer.invoke("dialog:alert", message),
  },

  // File operations
  files: {
    selectFile: (options) => ipcRenderer.invoke("select-file", options),
    saveFile: (options) => ipcRenderer.invoke("save-file", options),
    readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
    writeFile: (filePath, data) =>
      ipcRenderer.invoke("write-file", filePath, data),
  },

  // GPU information
  gpu: {
    getInfo: () => ipcRenderer.invoke("get-gpu-info"),
  },

  // NOTIFICATION OPERATIONS
  notifications: {
    showImmediate: (options) =>
      ipcRenderer.invoke("notifications:showImmediate", options),
    requestPermission: () =>
      ipcRenderer.invoke("notifications:requestPermission"),
    scheduleReminder: (options) =>
      ipcRenderer.invoke("notifications:scheduleReminder", options),
    cancelNotification: (id) => ipcRenderer.invoke("notifications:cancel", id),
  },
  // USER MANAGEMENT OPERATIONS
  user: {
    storeActiveUser: (userId) =>
      ipcRenderer.invoke("store-active-user", userId),
  },
});

// ============================================================================
// ELECTRON INPUT FOCUS BUG FIX - OVERRIDE NATIVE DIALOGS
// ============================================================================
// Override native dialogs to call main process with focus restoration

window.addEventListener("DOMContentLoaded", () => {
  // Store original dialog functions
  const originalConfirm = window.confirm;
  const originalAlert = window.alert;

  // Override confirm with focus-safe version
  window.confirm = function (message) {
    try {
      // Use our custom dialog system that handles focus properly
      return window.electronAPI.dialogs.confirm(message);
    } catch (error) {
      console.error("Error with custom confirm dialog, falling back:", error);
      // Fallback to original but with immediate focus recovery attempt
      const result = originalConfirm.call(this, message);
      // Attempt basic focus recovery
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement) {
          activeElement.blur();
          activeElement.focus();
        }
      }, 100);
      return result;
    }
  };

  // Override alert with focus-safe version
  window.alert = function (message) {
    try {
      // Use our custom dialog system that handles focus properly
      window.electronAPI.dialogs.alert(message);
    } catch (error) {
      console.error("Error with custom alert dialog, falling back:", error);
      // Fallback to original but with immediate focus recovery attempt
      originalAlert.call(this, message);
      // Attempt basic focus recovery
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement) {
          activeElement.blur();
          activeElement.focus();
        }
      }, 100);
    }
  };

  console.log("Dialog overrides installed - input focus bug fix active");
});

// Remove any node integration
delete window.require;
delete window.exports;
delete window.module;

console.log("Preload script loaded successfully");
console.log(
  "ElectronAPI exposed to renderer:",
  Object.keys(window.electronAPI || {}),
);
