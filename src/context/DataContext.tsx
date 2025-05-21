import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { fetchTasks, updateTask, addTask, deleteTask } from "../api/Task";
import {
  fetchEvents,
  addEvent,
  updateEvent,
  deleteEvent,
} from "../api/Calendar";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import { debounce } from "../utils/helpers";
import { startOfWeek, endOfWeek, addDays, format } from "date-fns";

// Constants for cache
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes cache expiry
const STORAGE_KEY_PREFIX = "wingman_data_cache_";

// Create the data context
const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Centralized cache state - store by week identifier
  const [taskCache, setTaskCache] = useState<Record<string, Record<string, Task[]>>>({});
  const [eventCache, setEventCache] = useState<Record<string, Record<string, CalendarEvent[]>>>({});
  // Add the missing weekCache state
  const [weekCache, setWeekCache] = useState<string[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState<string>("");
  const [requestedWeekId, setRequestedWeekId] = useState<string | null>(null);

  // Track when week data was last fetched
  const [lastFetched, setLastFetched] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}lastFetched`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Add the missing clearAllCache function
  const clearAllCache = useCallback(() => {
    // Clear in-memory caches
    setTaskCache({});
    setEventCache({});
    setWeekCache([]);
    setLastFetched({});

    // Clear localStorage caches
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}taskCache`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}eventCache`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}lastFetched`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}weekCache`);
    
    console.log("All caches cleared");
  }, []);

  // Add function to invalidate specific date cache
  const invalidateCache = useCallback((date: string) => {
    const weekId = getWeekId(date);
    
    setLastFetched(prev => {
      const newLastFetched = { ...prev };
      delete newLastFetched[weekId];
      return newLastFetched;
    });
    
    console.log(`Cache invalidated for week of ${weekId}`);
  }, []);

  // Get week ID from a date
  const getWeekId = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday as first day
    return format(weekStart, "yyyy-MM-dd");
  }, []);

  // Initialize current week on mount
  useEffect(() => {
    const today = new Date();
    const thisWeekId = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
    setCurrentWeekId(thisWeekId);
    
    // Immediately fetch current week data
    fetchWeekData(thisWeekId);
  }, []);

  // Get all dates in a week
  const getDatesInWeek = useCallback((weekId: string): string[] => {
    const weekStart = new Date(weekId);
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      dates.push(format(date, "yyyy-MM-dd"));
    }
    
    return dates;
  }, []);

  // Check if a week needs to be refreshed
  const needsWeekRefresh = useCallback(
    (weekId: string): boolean => {
      const lastFetch = lastFetched[weekId];
      if (!lastFetch) return true;
      return Date.now() - lastFetch > CACHE_EXPIRY_MS;
    },
    [lastFetched]
  );

  // Mark a week as fetched
  const markWeekFetched = useCallback((weekId: string) => {
    setLastFetched((prev) => ({
      ...prev,
      [weekId]: Date.now(),
    }));
  }, []);

  // Add this function to check if we need to fetch
  const isInCachedRange = useCallback((date: string): boolean => {
    // Check if this date exists in our cache
    const weekId = getWeekId(date);
    return !!taskCache[weekId] && !!eventCache[weekId];
  }, [taskCache, eventCache, getWeekId]);

  // Fetch entire week of data
  const fetchWeekData = useCallback(async (weekStartDate: string) => {
    const weekId = getWeekId(weekStartDate);
    
    // Already fetched/fetching this week?
    if (
      weekCache.includes(weekId) && 
      !needsWeekRefresh(weekId) &&
      taskCache[weekId] && 
      eventCache[weekId]
    ) {
      console.log(`Using cached data for week ${weekId}`);
      return;
    }
    
    // Set loading state
    setLoading(true);
    
    try {
      // Set a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Data fetch timeout")), 10000);
      });
      
      // Get all dates in the week
      const datesInWeek = getDatesInWeek(weekId);

      // Use Promise.race to implement timeout
      await Promise.race([
        // Actual data fetching
        Promise.all(
          datesInWeek.map(async (dateStr) => {
            try {
              // Fetch tasks and events for this date
              const [tasks, events] = await Promise.all([
                fetchTasks(dateStr),
                fetchEvents(dateStr),
              ]);

              // Update caches
              setTaskCache((prev) => {
                const updated = { ...prev };
                if (!updated[weekId]) updated[weekId] = {};
                updated[weekId][dateStr] = tasks;
                return updated;
              });

              setEventCache((prev) => {
                const updated = { ...prev };
                if (!updated[weekId]) updated[weekId] = {};
                updated[weekId][dateStr] = events;
                return updated;
              });
            } catch (error) {
              console.error(`Error fetching data for ${dateStr}:`, error);
              // Don't rethrow - keep trying other dates
            }
          })
        ),
        timeoutPromise
      ]);

      // Add the week to weekCache if not already there
      if (!weekCache.includes(weekId)) {
        setWeekCache(prev => [...prev, weekId]);
      }
      
      // Mark week as fetched
      markWeekFetched(weekId);
    } catch (error) {
      console.error(`Error fetching week ${weekId} data:`, error);
      setError(`Failed to load data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
      setRequestedWeekId(null);
    }
  }, [
    weekCache, // Add to dependencies
    currentWeekId,
    taskCache,
    eventCache, 
    needsWeekRefresh,
    getDatesInWeek,
    markWeekFetched
  ]);

  // Save cache to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}taskCache`,
        JSON.stringify(taskCache)
      );
    } catch (e) {
      console.error("Error saving task cache:", e);
    }
  }, [taskCache]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}eventCache`,
        JSON.stringify(eventCache)
      );
    } catch (e) {
      console.error("Error saving event cache:", e);
    }
  }, [eventCache]);

  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}lastFetched`,
      JSON.stringify(lastFetched)
    );
  }, [lastFetched]);

  // Add weekCache to localStorage effect
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}weekCache`, JSON.stringify(weekCache));
    } catch (error) {
      console.error("Error saving week cache to localStorage:", error);
    }
  }, [weekCache]);
  
  // Load weekCache from localStorage on mount
  useEffect(() => {
    try {
      const cachedWeeks = localStorage.getItem(`${STORAGE_KEY_PREFIX}weekCache`);
      if (cachedWeeks) {
        setWeekCache(JSON.parse(cachedWeeks));
      }
    } catch (error) {
      console.error("Error loading week cache from localStorage:", error);
    }
  }, []);
  
  // Fetch tasks for specific date (using weekly cache)
  const fetchTasksByDate = useCallback(
    async (date: string): Promise<Task[]> => {
      const weekId = getWeekId(date);
      
      // If no cache exists for this week, fetch the entire week
      if (!taskCache[weekId] || needsWeekRefresh(weekId)) {
        await fetchWeekData(weekId);
      }
      
      // Return tasks from cache
      return taskCache[weekId]?.[date] || [];
    },
    [taskCache, getWeekId, needsWeekRefresh, fetchWeekData]
  );

  // Fetch events for specific date (using weekly cache)
  const fetchEventsByDate = useCallback(
    async (date: string): Promise<CalendarEvent[]> => {
      const weekId = getWeekId(date);
      
      // If no cache exists for this week, fetch the entire week
      if (!eventCache[weekId] || needsWeekRefresh(weekId)) {
        await fetchWeekData(weekId);
      }
      
      // Return events from cache
      return eventCache[weekId]?.[date] || [];
    },
    [eventCache, getWeekId, needsWeekRefresh, fetchWeekData]
  );

  // Toggle task completed status
  const toggleTask = useCallback(async (task: Task): Promise<Task> => {
    try {
      setLoading(true);
      setError(null);
      
      // Create updated task object
      const updatedTask = { ...task, completed: !task.completed };
      
      // Update the task in backend
      const result = await updateTask(updatedTask);
      
      // Update task in cache
      const weekId = getWeekId(task.date);
      
      setTaskCache((prevCache) => {
        // If this week doesn't exist in cache yet, don't attempt to update
        if (!prevCache[weekId] || !prevCache[weekId][task.date]) {
          return prevCache;
        }
        
        const newCache = { ...prevCache };
        
        // Update the task in the week's cache
        newCache[weekId] = {
          ...newCache[weekId],
          [task.date]: newCache[weekId][task.date].map(t => 
            t.id === task.id ? result : t
          )
        };
        
        return newCache;
      });
      
      return result;
    } catch (err) {
      setError(`Failed to update task: ${err}`);
      console.error("Error toggling task:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWeekId]);

  // Add new task (with cache update)
  const addNewTask = useCallback(async (task: Partial<Task>): Promise<Task> => {
    try {
      const savedTask = await addTask(task);
      const weekId = getWeekId(savedTask.date);
      
      // Update cache
      setTaskCache((prev) => {
        // Initialize week and date in cache if they don't exist
        if (!prev[weekId]) {
          prev[weekId] = {};
        }
        
        if (!prev[weekId][savedTask.date]) {
          prev[weekId][savedTask.date] = [];
        }
        
        return {
          ...prev,
          [weekId]: {
            ...prev[weekId],
            [savedTask.date]: [...prev[weekId][savedTask.date], savedTask],
          }
        };
      });

      return savedTask;
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  }, [getWeekId]);

  // Delete task (with cache update)
  const deleteExistingTask = useCallback(
    async (taskId: number): Promise<void> => {
      try {
        await deleteTask(taskId);

        // Find and remove task from cache
        setTaskCache((prev) => {
          const newCache = { ...prev };
          for (const week in newCache) {
            const dates = newCache[week];
            for (const date in dates) {
              const tasks = dates[date];
              const index = tasks.findIndex((t) => t.id === taskId);
              if (index !== -1) {
                newCache[week][date] = [
                  ...tasks.slice(0, index),
                  ...tasks.slice(index + 1),
                ];
                return newCache;
              }
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
          const weekId = getWeekId(savedEvent.date);
          // Initialize week and date in cache if they don't exist
          if (!prev[weekId]) {
            prev[weekId] = {};
          }
          
          if (!prev[weekId][savedEvent.date]) {
            prev[weekId][savedEvent.date] = [];
          }
          
          return {
            ...prev,
            [weekId]: {
              ...prev[weekId],
              [savedEvent.date]: [...prev[weekId][savedEvent.date], savedEvent],
            }
          };
        });

        return savedEvent;
      } catch (error) {
        console.error("Error adding event:", error);
        throw error;
      }
    },
    [getWeekId]
  );

  // Delete event (with cache update)
  const deleteExistingEvent = useCallback(
    async (eventId: number): Promise<void> => {
      try {
        await deleteEvent(eventId);

        // Find and remove event from cache
        setEventCache((prev) => {
          const newCache = { ...prev };
          for (const week in newCache) {
            const dates = newCache[week];
            for (const date in dates) {
              const events = dates[date];
              const index = events.findIndex((e) => e.id === eventId);
              if (index !== -1) {
                newCache[week][date] = [
                  ...events.slice(0, index),
                  ...events.slice(index + 1),
                ];
                return newCache;
              }
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
      
      // Refetch current week data
      await fetchWeekData(currentWeekId);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [clearAllCache, currentWeekId, fetchWeekData]);

  // Provide the context values
  const value = {
    loading,
    error,
    fetchWeekData,
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
    currentWeekId,
    requestedWeekId
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Hook for using the data context
export const useData = () => {
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
  fetchWeekData: (weekId?: string) => Promise<void>;
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
  taskCache: Record<string, Record<string, Task[]>>;
  eventCache: Record<string, Record<string, CalendarEvent[]>>;
  currentWeekId: string;
  requestedWeekId: string | null;
}
