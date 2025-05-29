import { api } from "./apiClient";
import { getCurrentUserId } from "../utils/auth";

// Define the Diary Entry interface for type safety
export interface DiaryEntry {
  id?: number;
  user_id?: string;
  title: string;
  content: string;
  date: string; // Frontend field
  entry_date?: string; // Backend field
  mood?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all diary entries for the current user
 */
export const fetchDiaryEntries = async (): Promise<DiaryEntry[]> => {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Use api client instead of raw fetch
    const entries = await api.get(`/v1/diary?user_id=${userId}`);

    // Map backend fields to frontend
    return entries.map((entry: any) => ({
      ...entry,
      date: entry.entry_date, // Map entry_date to date for frontend
    }));
  } catch (error) {
    console.error("Error fetching diary entries:", error);
    throw error;
  }
};

/**
 * Fetch a single diary entry by ID
 */
export const fetchDiaryEntry = async (id: number): Promise<DiaryEntry> => {
  try {
    const userId = getCurrentUserId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Use api client instead of raw fetch
    const entry = await api.get(`/v1/diary/entries/${id}?user_id=${userId}`);

    // Map backend fields to frontend
    return {
      ...entry,
      date: entry.entry_date,
    };
  } catch (error) {
    console.error(`Error fetching diary entry ${id}:`, error);
    throw error;
  }
};

/**
 * Add a new diary entry
 */
export const addDiaryEntry = async (
  entry: Omit<DiaryEntry, "id">
): Promise<DiaryEntry> => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user.id) {
      throw new Error("User not authenticated");
    }

    // Map frontend fields to backend fields
    const backendEntry = {
      title: entry.title,
      content: entry.content,
      entry_date: entry.date, // For the database field
      date: entry.date, // Add this! Needed for Pydantic validation
      mood: entry.mood || "neutral",
      user_id: user.id,
    };

    // Use api client instead of raw fetch
    const newEntry = await api.post("/v1/diary/entries", backendEntry);

    // Map backend fields to frontend
    return {
      ...newEntry,
      date: newEntry.entry_date,
    };
  } catch (error) {
    console.error("Error adding diary entry:", error);
    throw new Error(
      `Failed to add diary entry: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Update an existing diary entry
 */
export const updateDiaryEntry = async (
  id: number,
  entry: Partial<DiaryEntry>
): Promise<DiaryEntry> => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user.id) {
      throw new Error("User not authenticated");
    }

    // Create a properly formatted entry for the backend
    const backendEntry: Record<string, any> = {
      user_id: user.id,
    };

    // Map fields correctly
    if (entry.title) backendEntry.title = entry.title;
    if (entry.content) backendEntry.content = entry.content;
    if (entry.mood) backendEntry.mood = entry.mood;

    // CRITICAL FIX: Always include date field required by Pydantic validation
    if (entry.date) {
      backendEntry.entry_date = entry.date; // For database
      backendEntry.date = entry.date; // For Pydantic validation
    } else {
      // If no date provided, use today's date as fallback
      const now = new Date();
      const today =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0");
      backendEntry.entry_date = today;
      backendEntry.date = today; // IMPORTANT: This is the missing field
    }

    console.log("Sending diary entry update to backend:", backendEntry);

    // Use api client instead of raw fetch
    const updatedEntry = await api.put(`/v1/diary/entries/${id}`, backendEntry);

    // Map backend fields to frontend
    return {
      ...updatedEntry,
      date: updatedEntry.entry_date,
    };
  } catch (error) {
    console.error(`Error updating diary entry ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a diary entry
 */
export const deleteDiaryEntry = async (id: number): Promise<void> => {
  try {
    // Use api client instead of raw fetch
    await api.delete(`/v1/diary/entries/${id}`);
  } catch (error) {
    console.error(`Error deleting diary entry ${id}:`, error);
    throw error;
  }
};
