import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { fetchTasks, addTask, updateTask, deleteTask } from "../api/Task";
import {
  fetchEvents,
  addEvent,
  updateEvent,
  deleteEvent,
} from "../api/Calendar";
import { debounce } from "../utils/helpers";

// Constants for cache
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes cache expiry
const STORAGE_KEY_PREFIX = "wingman_data_cache_";

// Helper functions for cache management
const loadCacheFromStorage = (key: string) => {
  try {
    const cache = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    if (cache) {
      const { data, timestamp } = JSON.parse(cache);
      // Check if cache is expired
      if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
        return data;
      }
    }
  } catch (error) {
    console.error(`Error loading cache for ${key}:`, error);
  }
  return null;
};

const saveCacheToStorage = (key: string, data: any) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${key}`,
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.error(`Error saving cache for ${key}:`, error);
  }
};

// Create the data context
const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Centralized cache state
  const [taskCache, setTaskCache] = useState<Record<string, Task[]>>({});
  const [eventCache, setEventCache] = useState<Record<string, CalendarEvent[]>>(
    {}
  );

  // Track when data was last fetched
  const [lastFetched, setLastFetched] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}lastFetched`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Save lastFetched timestamps whenever they change
  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}lastFetched`,
      JSON.stringify(lastFetched)
    );
  }, [lastFetched]);

  // Load initial cache from localStorage on mount
  useEffect(() => {
    // Load task cache
    const initialTaskCache = loadCacheFromStorage("tasks") || {};
    if (Object.keys(initialTaskCache).length > 0) {
      setTaskCache(initialTaskCache);
    }

    // Load event cache
    const initialEventCache = loadCacheFromStorage("events") || {};
    if (Object.keys(initialEventCache).length > 0) {
      setEventCache(initialEventCache);
    }
  }, []);

  // Save cache to localStorage when it changes (debounced to avoid excessive writes)
  const saveTaskCache = useCallback(
    debounce((cache) => {
      saveCacheToStorage("tasks", cache);
    }, 1000),
    []
  );

  const saveEventCache = useCallback(
    debounce((cache) => {
      saveCacheToStorage("events", cache);
    }, 1000),
    []
  );

  // Update local storage whenever cache changes
  useEffect(() => {
    saveTaskCache(taskCache);
  }, [taskCache, saveTaskCache]);

  useEffect(() => {
    saveEventCache(eventCache);
  }, [eventCache, saveEventCache]);

  // Check if a date needs to be refreshed
  const needsRefresh = useCallback(
    (dateStr: string): boolean => {
      const lastFetch = lastFetched[dateStr];
      if (!lastFetch) return true;
      return Date.now() - lastFetch > CACHE_EXPIRY_MS;
    },
    [lastFetched]
  );

  // Mark a date as freshly fetched
  const markFetched = useCallback((dateStr: string) => {
    setLastFetched((prev) => ({
      ...prev,
      [dateStr]: Date.now(),
    }));
  }, []);

  // Fetch tasks with caching
  const fetchTasksByDate = useCallback(
    async (date: string): Promise<Task[]> => {
      try {
        // Return cached data if available and not expired
        if (taskCache[date] && !needsRefresh(date)) {
          console.log(`Using cached tasks for ${date}`);
          return taskCache[date];
        }

        console.log(`Fetching tasks for ${date} from API`);
        const tasksData = await fetchTasks(date);

        // Update cache
        setTaskCache((prev) => ({
          ...prev,
          [date]: tasksData,
        }));

        // Mark as fetched
        markFetched(date);

        return tasksData;
      } catch (error) {
        console.error(`Error fetching tasks for ${date}:`, error);
        return taskCache[date] || []; // Return cached data on error if available
      }
    },
    [taskCache, needsRefresh, markFetched]
  );

  // Fetch events with caching
  const fetchEventsByDate = useCallback(
    async (date: string): Promise<CalendarEvent[]> => {
      try {
        // Return cached data if available and not expired
        if (eventCache[date] && !needsRefresh(date)) {
          console.log(`Using cached events for ${date}`);
          return eventCache[date];
        }

        console.log(`Fetching events for ${date} from API`);
        const eventsData = await fetchEvents(date);

        // Update cache
        setEventCache((prev) => ({
          ...prev,
          [date]: eventsData,
        }));

        // Mark as fetched
        markFetched(date);

        return eventsData;
      } catch (error) {
        console.error(`Error fetching events for ${date}:`, error);
        return eventCache[date] || []; // Return cached data on error if available
      }
    },
    [eventCache, needsRefresh, markFetched]
  );

  // Clear specific date cache
  const invalidateCache = useCallback((date: string) => {
    setLastFetched((prev) => {
      const newLastFetched = { ...prev };
      delete newLastFetched[date];
      return newLastFetched;
    });
  }, []);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    setTaskCache({});
    setEventCache({});
    setLastFetched({});
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}tasks`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}events`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}lastFetched`);
  }, []);

  // Toggle task (with cache update)
  const toggleTask = useCallback(async (task: Task): Promise<Task> => {
    try {
      const updatedTask = { ...task, completed: !task.completed };
      const savedTask = await updateTask(updatedTask);

      // Update cache
      setTaskCache((prev) => {
        const dateTasks = prev[task.date] || [];
        return {
          ...prev,
          [task.date]: dateTasks.map((t) => (t.id === task.id ? savedTask : t)),
        };
      });

      return savedTask;
    } catch (error) {
      console.error("Error toggling task:", error);
      throw error;
    }
  }, []);

  // Add new task (with cache update)
  const addNewTask = useCallback(async (task: Partial<Task>): Promise<Task> => {
    try {
      const savedTask = await addTask(task);

      // Update cache
      setTaskCache((prev) => {
        const dateTasks = prev[savedTask.date] || [];
        return {
          ...prev,
          [savedTask.date]: [...dateTasks, savedTask],
        };
      });

      return savedTask;
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  }, []);

  // Delete task (with cache update)
  const deleteExistingTask = useCallback(
    async (taskId: number): Promise<void> => {
      try {
        await deleteTask(taskId);

        // Find and remove task from cache
        setTaskCache((prev) => {
          const newCache = { ...prev };
          for (const date in newCache) {
            const tasks = newCache[date];
            const index = tasks.findIndex((t) => t.id === taskId);
            if (index !== -1) {
              newCache[date] = [
                ...tasks.slice(0, index),
                ...tasks.slice(index + 1),
              ];
              break;
            }
          }
          return newCache;
        });
      } catch (error) {
        console.error("Error deleting task:", error);
        throw error;
      }
    },
    []
  );

  // Add new event (with cache update)
  const addNewEvent = useCallback(
    async (event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
      try {
        const savedEvent = await addEvent(event);

        // Update cache
        setEventCache((prev) => {
          const dateEvents = prev[savedEvent.date] || [];
          return {
            ...prev,
            [savedEvent.date]: [...dateEvents, savedEvent],
          };
        });

        return savedEvent;
      } catch (error) {
        console.error("Error adding event:", error);
        throw error;
      }
    },
    []
  );

  // Delete event (with cache update)
  const deleteExistingEvent = useCallback(
    async (eventId: number): Promise<void> => {
      try {
        await deleteEvent(eventId);

        // Find and remove event from cache
        setEventCache((prev) => {
          const newCache = { ...prev };
          for (const date in newCache) {
            const events = newCache[date];
            const index = events.findIndex((e) => e.id === eventId);
            if (index !== -1) {
              newCache[date] = [
                ...events.slice(0, index),
                ...events.slice(index + 1),
              ];
              break;
            }
          }
          return newCache;
        });
      } catch (error) {
        console.error("Error deleting event:", error);
        throw error;
      }
    },
    []
  );

  // Full refresh of all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Clear caches and refetch when needed
      clearAllCache();
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [clearAllCache]);

  // Provide the context values
  const value = {
    loading,
    error,
    fetchTasksByDate,
    fetchEventsByDate,
    toggleTask,
    addNewTask,
    deleteExistingTask,
    addNewEvent,
    deleteExistingEvent,
    refreshData,
    invalidateCache,
    clearAllCache,
    taskCache,
    eventCache,
    lastFetched,
    needsRefresh,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Hook for using the data context
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

// Types to ensure in DataContext.tsx
export interface DataContextType {
  loading: boolean;
  error: string | null;
  fetchTasksByDate: (date: string) => Promise<Task[]>;
  fetchEventsByDate: (date: string) => Promise<CalendarEvent[]>;
  toggleTask: (task: Task) => Promise<Task>;
  addNewTask: (task: Partial<Task>) => Promise<Task>;
  deleteExistingTask: (taskId: number) => Promise<void>;
  addNewEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  deleteExistingEvent: (eventId: number) => Promise<void>;
  refreshData: () => Promise<void>;
  invalidateCache: (date: string) => void;
  clearAllCache: () => void;
  taskCache: Record<string, Task[]>;
  eventCache: Record<string, CalendarEvent[]>;
  lastFetched: Record<string, number>;
  needsRefresh: (date: string) => boolean;
}
