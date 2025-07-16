interface ElectronAPI {
  db: {
    // Task methods
    getTasks: (userId: string, date: string) => Promise<any[]>;
    getAllTasks: (userId: string) => Promise<any[]>;
    saveTask: (task: any) => Promise<any>;
    updateTask: (id: number, updates: any) => Promise<any>;
    deleteTask: (
      id: number,
    ) => Promise<{ success: boolean; deletedId: number }>;

    // Event methods
    getEvents: (userId: string, date: string) => Promise<any[]>;
    getAllEvents: (userId: string) => Promise<any[]>;
    saveEvent: (event: any) => Promise<any>;
    updateEvent: (event: any) => Promise<any>;
    deleteEvent: (
      id: number,
    ) => Promise<{ success: boolean; deletedId: number }>;

    // Diary methods
    getDiaryEntries: (userId: string, date: string) => Promise<any[]>;
    getAllDiaryEntries: (userId: string) => Promise<any[]>;
    saveDiaryEntry: (entry: any) => Promise<any>;
    deleteDiaryEntry: (
      id: number,
    ) => Promise<{ success: boolean; deletedId: number }>;

    // Chat methods
    getChatHistory: (userId: string, limit?: number) => Promise<any[]>;
    saveChatMessage: (
      message: string,
      isAi: boolean,
      userId: string,
      sessionId: string,
    ) => Promise<any>;
    clearChatHistory: (userId: string) => Promise<{ success: boolean }>;

    // Recurring task methods
    saveRecurringTask: (recurringTask: any) => Promise<any>;
    getRecurringTasks: (userId: string) => Promise<any[]>;
    updateRecurringTask: (id: number, updates: any) => Promise<any>;
    deleteRecurringTask: (
      id: number,
    ) => Promise<{ success: boolean; deleted?: boolean; error?: string }>;

    generateRecurringTasks: (
      userId: string,
      targetDate?: string,
    ) => Promise<any>;
    handleRecurringTaskCompletion: (
      taskId: number,
    ) => Promise<{ success: boolean; task?: any; message: string }>;

    // User methods
    createUser: (
      userData: any,
    ) => Promise<{ success: boolean; userId?: string; error?: string }>;
    getUser: (
      userId: string,
    ) => Promise<{ success: boolean; user?: any; error?: string }>;
    updateUser: (
      userId: string,
      updates: any,
    ) => Promise<{ success: boolean; error?: string }>;
    deleteUser: (
      userId: string,
    ) => Promise<{ success: boolean; error?: string }>;

    // Authentication methods
    storeUserCredentials: (userId: string, userData: any) => Promise<any>;
    getUserCredentials: (username: string, password: string) => Promise<any>;
    usernameExistsLocally: (username: string) => Promise<boolean>;
    userNeedsSync: (userId: string) => Promise<boolean>;
    markUserSynced: (userId: string) => Promise<any>;
    getCurrentUser: () => Promise<any>;
    getUserById: (userId: string) => Promise<any>;
    clearUserCredentials: () => Promise<any>;
  };

  // Dialog methods for fixing input focus bug
  dialogs: {
    confirm: (message: string) => Promise<boolean>;
    alert: (message: string) => Promise<void>;
  };
}
