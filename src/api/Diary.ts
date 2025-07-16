/**
 * Diary types and utilities
 */

/**
 * Represents a diary entry with mood and content
 */
export interface DiaryEntry {
  id: number;
  user_id: string;
  entry_date: string; // (YYYY-MM-DD format)
  title: string;
  content: string;
  mood: string;
  created_at?: string;
  updated_at?: string;

  // For compatibility with older components
  date?: string; // Maps to entry_date
}

// Helper functions

/**
 * types for diary entries
 */
export const validateDiaryEntry = (
  entry: Partial<DiaryEntry>,
): entry is DiaryEntry => {
  return !!(
    entry.id &&
    entry.user_id &&
    entry.title &&
    entry.content &&
    (entry.entry_date || entry.date)
  );
};

/**
 * default diary entry structure
 */
export const createDefaultDiaryEntry = (
  overrides: Partial<DiaryEntry> = {},
): Omit<DiaryEntry, "id"> => {
  const today = new Date().toISOString().split("T")[0];

  return {
    user_id: "",
    title: "",
    content: "",
    entry_date: today,
    mood: "neutral",
    ...overrides,
  };
};

/**
 * check if an entry is from today
 */
export const isDiaryEntryToday = (entry: DiaryEntry): boolean => {
  const today = new Date().toISOString().split("T")[0];
  const entryDate = entry.entry_date || entry.date || "";
  return entryDate === today;
};

/**
 * filter diary entries by date range
 */
export const filterDiaryEntriesByDateRange = (
  entries: DiaryEntry[],
  startDate: string,
  endDate: string,
): DiaryEntry[] => {
  return entries.filter((entry) => {
    const entryDate = entry.entry_date || entry.date || "";
    return entryDate >= startDate && entryDate <= endDate;
  });
};

/**
 * sort diary entries by date in descending order
 */
export const sortDiaryEntriesByDate = (entries: DiaryEntry[]): DiaryEntry[] => {
  return [...entries].sort((a, b) => {
    const dateA = a.entry_date || a.date || "";
    const dateB = b.entry_date || b.date || "";
    return dateB.localeCompare(dateA);
  });
};

/**
 * Group diary entries by month
 */
export const groupDiaryEntriesByMonth = (
  entries: DiaryEntry[],
): Record<string, DiaryEntry[]> => {
  return entries.reduce(
    (groups, entry) => {
      const entryDate = entry.entry_date || entry.date || "";
      const monthKey = entryDate.substring(0, 7); // YYYY-MM

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(entry);
      return groups;
    },
    {} as Record<string, DiaryEntry[]>,
  );
};

/**
 * colour codes for moods (some types may not be used in the future, but included for consistency)
 */
export const getMoodColor = (mood: string): string => {
  const moodColors: Record<string, string> = {
    productive: "#10b981", // Green
    chill: "#3b82f6", // Blue
    focused: "#8b5cf6", // Purple
    creative: "#f59e0b", // Orange
    energetic: "#ef4444", // Red
    neutral: "#6b7280", // Gray
    happy: "#eab308", // Yellow
    sad: "#06b6d4", // Cyan
    anxious: "#f97316", // Orange-red
    calm: "#22c55e", // Light green
  };

  return moodColors[mood.toLowerCase()] || moodColors["neutral"];
};

/**
 * Extract mood from content using simple keyword analysis (may not be used in the future, but keep since its modular)
 */
export const extractMoodFromContent = (content: string): string => {
  const moodKeywords: Record<string, string[]> = {
    happy: [
      "happy",
      "joy",
      "excited",
      "great",
      "awesome",
      "fantastic",
      "wonderful",
    ],
    productive: [
      "productive",
      "accomplished",
      "finished",
      "completed",
      "achieved",
      "success",
    ],
    focused: ["focused", "concentrated", "deep work", "flow", "immersed"],
    creative: ["creative", "inspired", "artistic", "imaginative", "innovative"],
    energetic: ["energetic", "active", "motivated", "driven", "dynamic"],
    chill: ["relaxed", "calm", "peaceful", "chill", "laid back"],
    sad: ["sad", "down", "depressed", "disappointed", "upset"],
    anxious: ["anxious", "worried", "stressed", "nervous", "overwhelmed"],
  };

  const lowerContent = content.toLowerCase();

  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some((keyword) => lowerContent.includes(keyword))) {
      return mood;
    }
  }

  return "neutral";
};

/**
 * Format entry date for display
 */
export const formatEntryDate = (entry: DiaryEntry): string => {
  const entryDate = entry.entry_date || entry.date;
  if (!entryDate) return "No date";

  try {
    const date = new Date(entryDate);
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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
  return entry.content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};

/**
 * Convert legacy frontend format to SQLite format
 */
export const convertLegacyEntry = (entry: any): DiaryEntry => {
  return {
    id: entry.id || 0,
    user_id: entry.user_id || "",
    title: entry.title || "",
    content: entry.content || "",
    entry_date: entry.date || entry.entry_date || "", // Handle both formats
    mood: entry.mood || "neutral",
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  };
};

// Export type utilities for other files
export type DiaryEntryWithoutId = Omit<DiaryEntry, "id">;
export type DiaryEntryUpdate = Partial<DiaryEntry>;
export type DiaryValidation = {
  isValid: boolean;
  errors: string[];
};

//mood type for consistency across components (some types may not be used in the future, but keep since its modular)
export type MoodType =
  | "productive"
  | "chill"
  | "focused"
  | "creative"
  | "energetic"
  | "neutral"
  | "happy"
  | "sad"
  | "anxious"
  | "calm";
