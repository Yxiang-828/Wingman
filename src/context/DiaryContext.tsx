import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { DiaryEntry } from "../api/Diary";
import { fetchDiaryEntries, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry } from "../api/Diary";

interface DiaryContextType {
  entries: DiaryEntry[];
  loading: boolean;
  addEntry: (entry: Omit<DiaryEntry, "id">) => Promise<DiaryEntry>;
  updateEntry: (entry: DiaryEntry) => Promise<DiaryEntry>;
  deleteEntry: (id: number) => Promise<void>;
  refreshEntries: () => Promise<void>;
}

const DiaryContext = createContext<DiaryContextType | null>(null);

export const DiaryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshEntries = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await fetchDiaryEntries(today);
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch diary entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = async (
    entry: Omit<DiaryEntry, "id">
  ): Promise<DiaryEntry> => {
    const newEntry = await addDiaryEntry(entry);
    setEntries((prev) => [...prev, newEntry]);
    return newEntry;
  };

  const updateEntry = async (entry: DiaryEntry): Promise<DiaryEntry> => {
    const updatedEntry = await updateDiaryEntry(entry);
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? updatedEntry : e))
    );
    return updatedEntry;
  };

  const deleteEntry = async (id: number): Promise<void> => {
    await deleteDiaryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  useEffect(() => {
    refreshEntries();
  }, []);

  return (
    <DiaryContext.Provider
      value={{
        entries,
        loading,
        addEntry,
        updateEntry,
        deleteEntry,
        refreshEntries,
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
