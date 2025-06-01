export {};

declare global {
  // Electron API interface - ENHANCED
  interface Window {
    electronAPI: {
      // ✅ EXISTING METHODS (keep these)
      onMoodChange: (callback: (mood: string) => void) => () => void;
      send: (channel: string, data: any) => void;
      setMaxMoodListeners: (count: number) => void;
      toggleDevTools: () => void;

      // ✅ NEW: DATABASE OPERATIONS
      db: {
        // TASK OPERATIONS
        getTasks: (userId: string, date?: string) => Promise<Wingman.Task[]>;
        saveTask: (task: Omit<Wingman.Task, 'id'> | Wingman.Task) => Promise<Wingman.Task>;
        updateTask: (id: number, updates: Partial<Wingman.Task>) => Promise<Wingman.Task | null>;
        deleteTask: (id: number) => Promise<{ success: boolean }>;

        // CALENDAR EVENT OPERATIONS
        getEvents: (userId: string, date?: string) => Promise<Wingman.CalendarEvent[]>;
        saveEvent: (event: Omit<Wingman.CalendarEvent, 'id'> | Wingman.CalendarEvent) => Promise<Wingman.CalendarEvent>;
        deleteEvent: (id: number) => Promise<{ success: boolean }>;

        // DIARY OPERATIONS
        getDiaryEntries: (userId: string, date?: string) => Promise<Wingman.DiaryEntry[]>;
        saveDiaryEntry: (entry: Omit<Wingman.DiaryEntry, 'id' | 'created_at' | 'updated_at'> | Wingman.DiaryEntry) => Promise<Wingman.DiaryEntry>;

        // CHAT OPERATIONS
        getChatHistory: (userId: string, limit?: number) => Promise<Wingman.ChatMessage[]>;
        saveChatMessage: (message: string, isAi: boolean, userId: string, sessionId?: number) => Promise<Wingman.ChatMessage>;
        clearChatHistory: (userId: string) => Promise<{ success: boolean }>;

        // UTILITY OPERATIONS
        getStorageStats: (userId: string) => Promise<{
          tasks: number;
          events: number;
          diary_entries: number;
          chat_messages: number;
          database_path?: string;
        }>;
      };
    };
  }
  
  // Supabase Database Types (keep existing)
  namespace Wingman {
    // Authentication & User Management
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
    
    // Chat System
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
    
    // Calendar & Scheduling
    interface CalendarEvent {
      id: string;
      user_id: string;
      title: string;
      event_date: string;
      event_time: string;
      type: string;
      description: string;
      created_at: string;
      updated_at: string;
    }
    
    interface Task {
      id: string;
      user_id: string;
      title: string;
      task_date: string;
      task_time: string;
      completed: boolean;
      created_at: string;
      updated_at: string;
      task_type: string;
      due_date: string;
      last_reset_date: string;
      urgency_level: number;
      status: string;
    }
    
    // Personal Journaling
    interface DiaryEntry {
      id: string;
      user_id: string;
      entry_date: string;
      title: string;
      content: string;
      mood: MoodType;
      created_at: string;
      updated_at: string;
    }
    
    // Domain-specific types
    type MoodType = 'productive' | 'chill' | 'focused' | 'creative' | 'energetic';
    
    // ActivityData for mood algorithm
    interface ActivityData {
      taskCompletionRate?: number;
      eventAttendance?: number;
      diaryEntryCount?: number;
      focusTime?: number;
      mood?: string;
    }
  }
}