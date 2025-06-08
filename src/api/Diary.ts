/**
 * Diary API - Hybrid Architecture Migration
 * Diary entries now handled by SQLite via DataContext for improved performance
 * This file provides type definitions and migration utilities
 */

/**
 * DiaryEntry interface - Compatible with both Supabase and SQLite schemas
 * Represents a personal journal entry with mood tracking
 */
export interface DiaryEntry {
  id: number;
  user_id: string;         // User identifier - diary_entries.user_id
  entry_date: string;      // Date in YYYY-MM-DD format - diary_entries.entry_date
  title: string;           // Entry title - diary_entries.title
  content: string;         // Entry content - diary_entries.content
  mood: string;            // Mood indicator - diary_entries.mood
  created_at?: string;     // Auto-generated timestamp
  updated_at?: string;     // Auto-generated timestamp
  
  // Legacy frontend field for backward compatibility
  date?: string;           // Maps to entry_date for existing components
}

// Migration notice for developers
console.warn('MIGRATION NOTICE: Diary API operations moved to DataContext + SQLite');
console.info('USE INSTEAD: useDataContext() with window.electronAPI.db.getDiaryEntries(), saveDiaryEntry()');

// ✅ LEGACY API FUNCTIONS - DEPRECATED
// These functions now throw errors to guide migration to DataContext

export const fetchDiaryEntries = async (): Promise<DiaryEntry[]> => {
  const errorMsg = `🚨 fetchDiaryEntries() is DEPRECATED. Use window.electronAPI.db.getDiaryEntries() instead.
  
BEFORE: fetchDiaryEntries()
AFTER:  const userId = getCurrentUserId();
        const entries = await window.electronAPI.db.getDiaryEntries(userId);`;
        
  console.error(errorMsg);
  throw new Error('fetchDiaryEntries() moved to window.electronAPI.db.getDiaryEntries() - check console for migration guide');
};

export const fetchDiaryEntry = async (id: number): Promise<DiaryEntry> => {
  const errorMsg = `🚨 fetchDiaryEntry() is DEPRECATED. Use window.electronAPI.db.getDiaryEntries() instead.
  
BEFORE: fetchDiaryEntry(${id})
AFTER:  const userId = getCurrentUserId();
        const entries = await window.electronAPI.db.getDiaryEntries(userId);
        const entry = entries.find(e => e.id === ${id});`;
        
  console.error(errorMsg);
  throw new Error('fetchDiaryEntry() moved to window.electronAPI.db.getDiaryEntries() - check console for migration guide');
};

export const addDiaryEntry = async (entry: Omit<DiaryEntry, "id">): Promise<DiaryEntry> => {
  const errorMsg = `🚨 addDiaryEntry() is DEPRECATED. Use window.electronAPI.db.saveDiaryEntry() instead.
  
BEFORE: addDiaryEntry(entryData)
AFTER:  const newEntry = await window.electronAPI.db.saveDiaryEntry(entryData);`;
        
  console.error(errorMsg);
  throw new Error('addDiaryEntry() moved to window.electronAPI.db.saveDiaryEntry() - check console for migration guide');
};

export const updateDiaryEntry = async (id: number, entry: Partial<DiaryEntry>): Promise<DiaryEntry> => {
  const errorMsg = `🚨 updateDiaryEntry() is DEPRECATED. Use window.electronAPI.db.saveDiaryEntry() instead.
  
BEFORE: updateDiaryEntry(${id}, entryData)
AFTER:  const updatedEntry = await window.electronAPI.db.saveDiaryEntry({
          ...entryData,
          id: ${id}
        });`;
        
  console.error(errorMsg);
  throw new Error('updateDiaryEntry() moved to window.electronAPI.db.saveDiaryEntry() - check console for migration guide');
};

export const deleteDiaryEntry = async (id: number): Promise<void> => {
  const errorMsg = `🚨 deleteDiaryEntry() is DEPRECATED. Direct deletion not implemented in SQLite version.
  
BEFORE: deleteDiaryEntry(${id})
AFTER:  // Note: Consider implementing delete functionality in LocalDataManager
        // For now, entries are preserved for data integrity`;
        
  console.error(errorMsg);
  throw new Error('deleteDiaryEntry() not available in SQLite version - entries preserved for data integrity');
};

// ✅ UTILITY FUNCTIONS - Still useful for type checking and validation

/**
 * Validate a diary entry object has required fields
 */
export const validateDiaryEntry = (entry: Partial<DiaryEntry>): entry is DiaryEntry => {
  return !!(
    entry.id &&
    entry.user_id &&
    entry.title &&
    entry.content &&
    (entry.entry_date || entry.date)
  );
};

/**
 * Create a default diary entry with current date
 */
export const createDefaultDiaryEntry = (overrides: Partial<DiaryEntry> = {}): Omit<DiaryEntry, 'id'> => {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    user_id: '',
    title: '',
    content: '',
    entry_date: today,
    mood: 'neutral',
    ...overrides
  };
};

/**
 * Check if a diary entry is from today
 */
export const isDiaryEntryToday = (entry: DiaryEntry): boolean => {
  const today = new Date().toISOString().split('T')[0];
  const entryDate = entry.entry_date || entry.date || '';
  return entryDate === today;
};

/**
 * Get diary entries for a specific date range
 */
export const filterDiaryEntriesByDateRange = (
  entries: DiaryEntry[], 
  startDate: string, 
  endDate: string
): DiaryEntry[] => {
  return entries.filter(entry => {
    const entryDate = entry.entry_date || entry.date || '';
    return entryDate >= startDate && entryDate <= endDate;
  });
};

/**
 * Sort diary entries by date (newest first)
 */
export const sortDiaryEntriesByDate = (entries: DiaryEntry[]): DiaryEntry[] => {
  return [...entries].sort((a, b) => {
    const dateA = a.entry_date || a.date || '';
    const dateB = b.entry_date || b.date || '';
    return dateB.localeCompare(dateA);
  });
};

/**
 * Group diary entries by month
 */
export const groupDiaryEntriesByMonth = (entries: DiaryEntry[]): Record<string, DiaryEntry[]> => {
  return entries.reduce((groups, entry) => {
    const entryDate = entry.entry_date || entry.date || '';
    const monthKey = entryDate.substring(0, 7); // YYYY-MM
    
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(entry);
    return groups;
  }, {} as Record<string, DiaryEntry[]>);
};

/**
 * Get mood color for UI consistency
 */
export const getMoodColor = (mood: string): string => {
  const moodColors: Record<string, string> = {
    'productive': '#10b981',    // Green
    'chill': '#3b82f6',         // Blue
    'focused': '#8b5cf6',       // Purple
    'creative': '#f59e0b',      // Orange
    'energetic': '#ef4444',     // Red
    'neutral': '#6b7280',       // Gray
    'happy': '#eab308',         // Yellow
    'sad': '#06b6d4',           // Cyan
    'anxious': '#f97316',       // Orange-red
    'calm': '#22c55e'           // Light green
  };
  
  return moodColors[mood.toLowerCase()] || moodColors['neutral'];
};

/**
 * Extract mood from content using simple keyword analysis
 */
export const extractMoodFromContent = (content: string): string => {
  const moodKeywords: Record<string, string[]> = {
    'happy': ['happy', 'joy', 'excited', 'great', 'awesome', 'fantastic', 'wonderful'],
    'productive': ['productive', 'accomplished', 'finished', 'completed', 'achieved', 'success'],
    'focused': ['focused', 'concentrated', 'deep work', 'flow', 'immersed'],
    'creative': ['creative', 'inspired', 'artistic', 'imaginative', 'innovative'],
    'energetic': ['energetic', 'active', 'motivated', 'driven', 'dynamic'],
    'chill': ['relaxed', 'calm', 'peaceful', 'chill', 'laid back'],
    'sad': ['sad', 'down', 'depressed', 'disappointed', 'upset'],
    'anxious': ['anxious', 'worried', 'stressed', 'nervous', 'overwhelmed']
  };
  
  const lowerContent = content.toLowerCase();
  
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      return mood;
    }
  }
  
  return 'neutral';
};

/**
 * Format entry date for display
 */
export const formatEntryDate = (entry: DiaryEntry): string => {
  const entryDate = entry.entry_date || entry.date;
  if (!entryDate) return 'No date';
  
  try {
    const date = new Date(entryDate);
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return entryDate;
  }
};

/**
 * Get entry word count
 */
export const getEntryWordCount = (entry: DiaryEntry): number => {
  if (!entry.content) return 0;
  return entry.content.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Convert legacy frontend format to SQLite format
 */
export const convertLegacyEntry = (entry: any): DiaryEntry => {
  return {
    id: entry.id || 0,
    user_id: entry.user_id || '',
    title: entry.title || '',
    content: entry.content || '',
    entry_date: entry.date || entry.entry_date || '', // Handle both formats
    mood: entry.mood || 'neutral',
    created_at: entry.created_at,
    updated_at: entry.updated_at
  };
};

// ✅ MIGRATION HELPER - Show current usage guide
export const showMigrationGuide = () => {
  console.info(`
🔄 DIARY API MIGRATION GUIDE

✅ NEW PATTERN (Direct SQLite):
import { getCurrentUserId } from '../utils/auth';

const DiaryComponent = () => {
  const userId = getCurrentUserId();
  
  // Fetch diary entries
  const entries = await window.electronAPI.db.getDiaryEntries(userId);
  
  // Fetch entries for specific date
  const todayEntries = await window.electronAPI.db.getDiaryEntries(userId, '2025-06-01');
  
  // Save new entry
  const newEntry = await window.electronAPI.db.saveDiaryEntry({
    user_id: userId,
    title: 'My Day',
    content: 'Had a great day...',
    entry_date: '2025-06-01',
    mood: 'happy'
  });
  
  // Update existing entry
  const updatedEntry = await window.electronAPI.db.saveDiaryEntry({
    id: entryId,
    user_id: userId,
    title: 'Updated Title',
    content: 'Updated content...',
    entry_date: '2025-06-01',
    mood: 'productive'
  });
};

❌ OLD PATTERN (Deprecated):
import { fetchDiaryEntries, addDiaryEntry } from '../api/Diary';
// These will throw errors now!
`);
};

// ✅ Export type utilities for other files
export type DiaryEntryWithoutId = Omit<DiaryEntry, 'id'>;
export type DiaryEntryUpdate = Partial<DiaryEntry>;
export type DiaryValidation = {
  isValid: boolean;
  errors: string[];
};

export type MoodType = 'productive' | 'chill' | 'focused' | 'creative' | 'energetic' | 'neutral' | 
                      'happy' | 'sad' | 'anxious' | 'calm';