export {};

declare global {
  interface Window {
    electronAPI: {
      onMoodChange: (callback: (mood: string) => void) => () => void;
      send: (channel: string, data: any) => void;
      setMaxMoodListeners: (count: number) => void;
      toggleDevTools: () => void;
      db: {
        getTasks: (userId: string, date?: string) => Promise<Wingman.Task[]>;
        getAllTasks: (userId: string) => Promise<Wingman.Task[]>;
        saveTask: (
          task: Omit<Wingman.Task, "id"> | Wingman.Task,
        ) => Promise<Wingman.Task>;
        updateTask: (
          id: number,
          updates: Partial<Wingman.Task>,
        ) => Promise<Wingman.Task | null>;
        deleteTask: (id: number) => Promise<{ success: boolean }>;

        getEvents: (
          userId: string,
          date?: string,
        ) => Promise<Wingman.CalendarEvent[]>;
        getAllEvents: (userId: string) => Promise<Wingman.CalendarEvent[]>;
        saveEvent: (
          event: Omit<Wingman.CalendarEvent, "id"> | Wingman.CalendarEvent,
        ) => Promise<Wingman.CalendarEvent>;
        updateEvent: (
          event: Wingman.CalendarEvent,
        ) => Promise<Wingman.CalendarEvent>;
        deleteEvent: (id: number) => Promise<{ success: boolean }>;

        getDiaryEntries: (
          userId: string,
          date?: string,
        ) => Promise<Wingman.DiaryEntry[]>;
        getAllDiaryEntries: (userId: string) => Promise<Wingman.DiaryEntry[]>;
        saveDiaryEntry: (
          entry:
            | Omit<Wingman.DiaryEntry, "id" | "created_at" | "updated_at">
            | Wingman.DiaryEntry,
        ) => Promise<Wingman.DiaryEntry>;

        getChatHistory: (
          userId: string,
          limit?: number,
        ) => Promise<Wingman.ChatMessage[]>;
        saveChatMessage: (
          message: string,
          isAi: boolean,
          userId: string,
          sessionId?: number,
        ) => Promise<Wingman.ChatMessage>;
        clearChatHistory: (userId: string) => Promise<{ success: boolean }>;
        getStorageStats: (userId: string) => Promise<{
          tasks: number;
          events: number;
          diary_entries: number;
          chat_messages: number;
          database_path?: string;
        }>;

        getUserSettings: (userId: string) => Promise<{
          id?: string;
          user_id?: string;
          ai_model?: string;
          ai_model_auto_selected?: boolean;
          theme?: string;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        }>;
        saveUserSettings: (
          userId: string,
          settings: {
            ai_model?: string;
            ai_model_auto_selected?: boolean;
            theme?: string;
            notifications_enabled?: boolean;
          },
        ) => Promise<{ success: boolean }>;

        getQuickPrompts: (userId: string) => Promise<any[]>;
        saveQuickPrompt: (
          userId: string,
          promptText: string,
        ) => Promise<{ id: number; success: boolean }>;
        deleteQuickPrompt: (promptId: number) => Promise<{ success: boolean }>;
        updateQuickPromptUsage: (
          promptId: number,
        ) => Promise<{ success: boolean }>;

        getDownloadedModels: (userId: string) => Promise<any[]>;
        saveDownloadedModel: (
          userId: string,
          modelData: any,
        ) => Promise<{ success: boolean; id: number }>;
        deleteDownloadedModel: (
          userId: string,
          modelName: string,
        ) => Promise<{ success: boolean }>;
        deleteDiaryEntry: (id: number) => Promise<{ success: boolean }>;
        // Recurring task methods
        saveRecurringTask: (recurringTask: any) => Promise<any>;
        getRecurringTasks: (userId: string) => Promise<any[]>;
        updateRecurringTask: (id: number, updates: any) => Promise<any>;
        deleteRecurringTask: (id: number) => Promise<{
          success: boolean;
          error?: string;
          deleted?: boolean;
          changes?: number;
          deletedTasks?: number;
        }>;
        generateRecurringTasks: (
          userId: string,
          targetDate?: string,
        ) => Promise<any>;
        handleRecurringTaskCompletion: (
          taskId: number,
        ) => Promise<{ success: boolean; task?: any; message: string }>;

        // Authentication methods
        storeUserCredentials: (userId: string, userData: any) => Promise<any>;
        getUserCredentials: (
          username: string,
          password: string,
        ) => Promise<any>;
        usernameExistsLocally: (username: string) => Promise<boolean>;
        userNeedsSync: (userId: string) => Promise<boolean>;
        markUserSynced: (userId: string) => Promise<any>;
        getCurrentUser: () => Promise<any>;
        clearUserCredentials: () => Promise<any>;
      };
      system: {
        toggleDevTools: () => void;
        openExternal: (url: string) => Promise<void>;
        getVersion: () => Promise<string>;
        getPlatform: () => string;
        isDevMode: () => boolean;
      };

      // Dialog methods for fixing input focus bug
      dialogs: {
        confirm: (message: string) => Promise<boolean>;
        alert: (message: string) => Promise<void>;
      };

      notifications: {
        showImmediate: (options: any) => Promise<any>;
        requestPermission: () => Promise<any>;
        scheduleReminder: (options: any) => Promise<any>;
        cancelNotification: (id: string) => Promise<any>;
        schedule: (options: any) => Promise<any>;
      };
      user: {
        storeActiveUser: (
          userId: string,
        ) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }

  namespace Wingman {
    interface User {
      id: string;
      name: string;
      email: string;
      password?: string;
      created_at: string;
      updated_at: string;
      username: string;
    }

    interface UserSetting {
      id: string;
      user_id: string;
      setting_key: string;
      setting_value: string;
    }

    interface ChatSession {
      id: string;
      user_id: string;
      title: string;
      started_at: string;
      updated_at: string;
    }

    interface ChatMessage {
      id: string;
      session_id: string;
      is_ai: boolean;
      message: string;
      timestamp: string;
      updated_at: string;
    }

    interface CalendarEvent {
      id: number;
      user_id: string;
      title: string;
      event_date: string;
      event_time: string;
      type: string;
      description: string;
      created_at?: string;
      updated_at?: string;
    }

    interface Task {
      id: number;
      user_id: string;
      title: string;
      task_date: string;
      task_time: string;
      completed: boolean;
      failed?: boolean; // Task failure status for deadline tracking
      created_at?: string;
      updated_at?: string;
      task_type?: string;
      due_date?: string;
      last_reset_date?: string;
      status?: string;
    }

    interface DiaryEntry {
      id: number;
      user_id: string;
      entry_date: string;
      title: string;
      content: string;
      mood: MoodType;
      created_at: string;
      updated_at: string;
    }

    type MoodType =
      | "productive"
      | "chill"
      | "focused"
      | "creative"
      | "energetic";

    interface ActivityData {
      taskCompletionRate?: number;
      eventAttendance?: number;
      diaryEntryCount?: number;
      focusTime?: number;
      mood?: string;
    }
  }
}

declare module "*.mp4" {
  const src: string;
  export default src;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.ico" {
  const src: string;
  export default src;
}

declare module "*.icns" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
