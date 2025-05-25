export {};

declare global {
  // Electron API interface
  interface Window {
    electronAPI: {
      onMoodChange: (callback: (mood: string) => void) => () => void;
      send: (channel: string, data: any) => void;
      setMaxMoodListeners: (count: number) => void;
    };
  }
  
  // Supabase Database Types
  namespace Wingman {
    // Authentication & User Management
    interface User {
      id: string;
      name: string;
      email: string;
      password?: string; // Not returned in queries
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
      mood: MoodType; // Using your custom mood type
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