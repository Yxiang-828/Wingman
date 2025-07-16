import "@testing-library/jest-dom";

window.electronAPI = {
  db: {
    // Task management operations
    // Mock async functions that our tasksCard and other components call
    getTasks: jest.fn(),
    saveTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),

    // Diary management operations
    // Used by diary components for mood tracking and journal entries
    saveDiaryEntry: jest.fn(),
    getDiaryEntries: jest.fn(),
    // Calendar event operations
    // Used by calendar components for event scheduling
    saveEvent: jest.fn(),
    getEvents: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),

    // User authentication and profile operations
    // Used by auth components and user management
    getCurrentUser: jest.fn(),
    saveUser: jest.fn(),

    // Recurring task template operations
    // Used by recurring task management components
    saveRecurringTask: jest.fn(),
    getRecurringTasks: jest.fn(),
    updateRecurringTask: jest.fn(),
    generateRecurringTasks: jest.fn(),

    // User settings and preferences
    // Used by settings components for theme, notifications, etc.
    getUserSettings: jest.fn(),
    saveUserSettings: jest.fn(),
  },

  // System notification operations
  // Used by notification service components
  notifications: {
    show: jest.fn(),
  },

  // System-level operations
  // Used by components that interact with the operating system
  system: {
    openExternal: jest.fn(),

    getVersion: jest.fn(),
  },

  // File system operations
  // Used by components that handle file uploads/downloads
  files: {
    // Mock file selection dialogs
    selectFile: jest.fn(),

    // Mock file reading operations
    readFile: jest.fn(),

    // Mock file writing operations
    writeFile: jest.fn(),
  },
};
