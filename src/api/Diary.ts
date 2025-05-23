// Diary API functions for interacting with the backend
import { getCurrentUserId } from '../utils/auth';

// Define the Diary Entry interface for type safety
export interface DiaryEntry {
  id?: number;
  user_id?: string;
  title: string;
  content: string;
  date: string;
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
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }
    
    const response = await fetch(`/api/v1/diary?user_id=${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch diary entries: ${response.status}`);
    }
    
    return await response.json();
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
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }
    
    // Add user_id as query parameter
    const response = await fetch(`/api/v1/diary/entries/${id}?user_id=${user.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching diary entry: ${response.status} - ${errorText}`);
      throw new Error(`Failed to fetch diary entry: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching diary entry ${id}:`, error);
    throw error;
  }
};

/**
 * Add a new diary entry
 */
export const addDiaryEntry = async (entry: Omit<DiaryEntry, 'id'>): Promise<DiaryEntry> => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }
    
    // Fix field mapping between frontend and backend
    const entryWithUser = {
      ...entry,
      user_id: user.id,
      // Map date to entry_date for the backend
      entry_date: entry.date,
    };
    
    console.log("Sending diary entry to backend:", entryWithUser);
    
    const response = await fetch('/api/v1/diary/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entryWithUser),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add diary entry: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding diary entry:', error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(`Failed to add diary entry: ${errorMessage}`);
  }
};

/**
 * Update an existing diary entry
 */
export const updateDiaryEntry = async (id: number, entry: Partial<DiaryEntry>): Promise<DiaryEntry> => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      throw new Error('User not authenticated');
    }
    
    // Create a properly formatted entry for the backend
    const backendEntry: Partial<DiaryEntry> & { user_id: string; entry_date?: string } = {
      ...entry,
      user_id: user.id,
    };
    
    // Add the crucial entry_date field that the backend requires
    if (!backendEntry.entry_date) {
      // If updating an existing entry, we need to include entry_date
      if (entry.date) {
        backendEntry.entry_date = entry.date;
      } else {
        // If no date provided, use today
        backendEntry.entry_date = new Date().toISOString().split('T')[0];
      }
    }
    
    console.log("Sending diary entry update to backend:", backendEntry);
    
    const response = await fetch(`/api/v1/diary/entries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendEntry),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Update failed with status ${response.status}: ${errorText}`);
      throw new Error(`Failed to update diary entry: ${response.status}`);
    }
    
    return await response.json();
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
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`/api/v1/diary/entries/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete diary entry: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error deleting diary entry ${id}:`, error);
    throw error;
  }
};