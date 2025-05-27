import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetchDiaryEntries,
  fetchDiaryEntry,
  addDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  type DiaryEntry,
} from "../api/Diary";
import { getCurrentUser } from "../utils/auth";

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

export const DiaryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    refreshEntries();
  }, []);

  // ✅ FIX: Remove throttling for initial load
  const refreshEntries = useCallback(async () => {
    setLoading(true);
    try {
      // Get user synchronously first
      const user = getCurrentUser();
      if (!user || !user.id) {
        console.log("DiaryContext: User not authenticated, skipping fetch");
        setLoading(false);
        return;
      }

      // ✅ REMOVED: Throttle check that was blocking fetches
      // Only throttle if this is NOT the first fetch
      const now = Date.now();
      const lastFetched = lastFetchedRef.current["entries"] || 0;
      const isFirstFetch = lastFetched === 0;

      if (!isFirstFetch && now - lastFetched < 5000) {
        console.log("Skipping diary fetch - recently fetched");
        setLoading(false);
        return;
      }

      lastFetchedRef.current["entries"] = now;
      const data = await fetchDiaryEntries();
      setEntries(data);
      console.log(`DiaryContext: Successfully loaded ${data.length} entries`);
    } catch (error) {
      console.error("Error fetching diary entries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getEntryById = async (id: number) => {
    try {
      const entry = await fetchDiaryEntry(id);
      return entry;
    } catch (error) {
      console.error(`Error fetching diary entry ${id}:`, error);
      throw error;
    }
  };

  const addEntry = async (entry: Omit<DiaryEntry, "id">) => {
    try {
      const newEntry = await addDiaryEntry(entry);
      await refreshEntries(); // Refresh the entries list
      return newEntry;
    } catch (error) {
      console.error("Error adding diary entry:", error);
      throw error;
    }
  };

  const updateEntry = async (id: number, entry: Partial<DiaryEntry>) => {
    try {
      const updatedEntry = await updateDiaryEntry(id, entry);
      await refreshEntries(); // Refresh the entries list
      return updatedEntry;
    } catch (error) {
      console.error(`Error updating diary entry ${id}:`, error);
      throw error;
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      await deleteDiaryEntry(id);
      // Update local state without refreshing from server
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
