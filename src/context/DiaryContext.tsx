import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { DiaryEntry } from "../api/Diary";
import { getCurrentUserId } from "../utils/auth";

interface DiaryContextProps {
  entries: DiaryEntry[];
  loading: boolean;
  refreshEntries: () => Promise<void>;
  getEntryById: (id: number) => Promise<DiaryEntry>;
  addEntry: (entry: Omit<DiaryEntry, "id">) => Promise<DiaryEntry>;
  updateEntry: (id: number, entry: Partial<DiaryEntry>) => Promise<DiaryEntry>;
  deleteEntry: (id: number) => Promise<void>;
}

const DiaryContext = createContext<DiaryContextProps | null>(null);

export const DiaryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ SIMPLIFIED: Direct SQLite data fetching
  const refreshEntries = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      console.log("DiaryContext: No user authenticated");
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("📖 DiaryContext: Fetching entries (direct SQLite)");
      const data = await window.electronAPI.db.getDiaryEntries(userId);
      setEntries(data || []);
      console.log(`✅ DiaryContext: Loaded ${data?.length || 0} entries`);
    } catch (error) {
      console.error("❌ DiaryContext: Error fetching entries:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  // ✅ SIMPLIFIED: Direct SQLite operations
  const getEntryById = async (id: number): Promise<DiaryEntry> => {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");
      
      const allEntries = await window.electronAPI.db.getDiaryEntries(userId);
      const entry = allEntries.find((e: DiaryEntry) => e.id === id);
      
      if (!entry) throw new Error(`Diary entry with ID ${id} not found`);
      return entry;
    } catch (error) {
      console.error(`Error fetching diary entry ${id}:`, error);
      throw error;
    }
  };

  const addEntry = async (entry: Omit<DiaryEntry, "id">): Promise<DiaryEntry> => {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");
      
      const entryWithUserId = {
        ...entry,
        user_id: userId,
        entry_date: entry.entry_date || new Date().toISOString().split('T')[0]
      };
      
      const newEntry = await window.electronAPI.db.saveDiaryEntry(entryWithUserId);
      await refreshEntries();
      return newEntry;
    } catch (error) {
      console.error("Error adding diary entry:", error);
      throw error;
    }
  };

  const updateEntry = async (id: number, entry: Partial<DiaryEntry>): Promise<DiaryEntry> => {
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");
      
      const entryWithIdAndUserId = {
        ...entry,
        id,
        user_id: userId
      };
      
      const updatedEntry = await window.electronAPI.db.saveDiaryEntry(entryWithIdAndUserId);
      await refreshEntries();
      return updatedEntry;
    } catch (error) {
      console.error(`Error updating diary entry ${id}:`, error);
      throw error;
    }
  };

  const deleteEntry = async (id: number): Promise<void> => {
    try {
      console.warn("Delete diary entry not implemented in SQLite version");
      // Just update local state for now
      setEntries(entries.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error(`Error deleting diary entry ${id}:`, error);
      throw error;
    }
  };

  return (
    <DiaryContext.Provider
      value={{
        entries,
        loading,
        refreshEntries,
        getEntryById,
        addEntry,
        updateEntry,
        deleteEntry,
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
};

export const useDiary = () => {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error("useDiary must be used within a DiaryProvider");
  }
  return context;
};
