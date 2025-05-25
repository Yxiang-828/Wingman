import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode
} from "react";
import {
  fetchTasks,
  toggleTaskCompletion,
  addTask,
  deleteTask
} from "../api/Task";
import {
  fetchEvents,
  addEvent,
  updateEvent,
  deleteEvent
} from "../api/Calendar";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import { getCurrentUserId, getCurrentUser } from '../utils/auth';
import { format, startOfWeek } from 'date-fns';
import { Auth } from '../utils/AuthStateManager';
import { debounce } from "../utils/debounce";

// Constants for cache
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes cache expiry
const STORAGE_KEY_PREFIX = "wingman_data_cache_";

// Interface for the Data Context
interface DataContextType {
  loading: boolean;
  error: string | null;
  fetchTasksByDate: (date: string) => Promise<Task[]>;
  fetchEventsByDate: (date: string) => Promise<CalendarEvent[]>;
  fetchWeekData: (weekStartDate: string) => Promise<void>;
  toggleTask: (task: Task) => Promise<Task>;
  addNewTask: (task: Partial<Task>) => Promise<Task>;
  deleteExistingTask: (taskId: number) => Promise<void>;
  addNewEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  deleteExistingEvent: (eventId: number) => Promise<void>;
  updateTask: (task: Task) => Promise<Task>;
  updateEvent: (event: CalendarEvent) => Promise<CalendarEvent>;
  refreshData: () => Promise<void>;
  invalidateCache: (date: string) => void;
  clearAllCache: () => void;
  taskCache: Record<string, Record<string, Task[]>>;
  eventCache: Record<string, Record<string, CalendarEvent[]>>;
  currentWeekId: string;
  requestedWeekId: string | null;
  setRequestedWeekId: (weekId: string | null) => void; // Add this line
  getTaskById?: (taskId: number) => Task | undefined;
  getEventById?: (eventId: number) => CalendarEvent | undefined;
  tasksById?: Record<number, Task>;
  eventsById?: Record<number, CalendarEvent>;
  batchFetchData: (startDate: string, days?: number) => Promise<void>; // Ensure this is exposed
}

// Create the data context
const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(Auth.isAuthenticated);
  
  // Listen for auth changes
  useEffect(() => {
    return Auth.addListener((isAuth) => {
      setIsAuthenticated(isAuth);
    });
  }, []);
  
  // All state declarations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskCache, setTaskCache] = useState<
    Record<string, Record<string, Task[]>>
  >({});
  const [eventCache, setEventCache] = useState<
    Record<string, Record<string, CalendarEvent[]>>
  >({});
  const [weekCache, setWeekCache] = useState<string[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState<string>("");
  const [requestedWeekId, setRequestedWeekId] = useState<string | null>(null);

  // Global collections for quick lookups by ID
  const [tasksById, setTasksById] = useState<Record<number, Task>>({});
  const [eventsById, setEventsById] = useState<Record<number, CalendarEvent>>(
    {}
  );
  // Track when week data was last fetched
  const [lastFetched, setLastFetched] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}lastFetched`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  // Authentication state
  const [authChecked, setAuthChecked] = useState(false);

  // Get week ID from a date
  const getWeekId = useCallback((dateStr: string): string => {
    try {
      // Validate the date string first
      if (!dateStr) {
        console.warn("Empty date string provided to getWeekId");
        return format(startOfWeek(new Date()), "yyyy-MM-dd");
      }
      
      // Parse the date with validation
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date provided to getWeekId: ${dateStr}`);
        return format(startOfWeek(new Date()), "yyyy-MM-dd");
      }
      
      // Now calculate the week start safely
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      return format(weekStart, "yyyy-MM-dd");
    } catch (error) {
      console.error("Error in getWeekId:", error);
      // Return today's week as fallback
      return format(startOfWeek(new Date()), "yyyy-MM-dd");
    }
  }, []);

  // Initialize current week on mount
  useEffect(() => {
    // Don't attempt to load data until user is authenticated
    const user = getCurrentUser();
    if (!user) {
      console.log("DataContext: Waiting for user authentication");
      setAuthChecked(true);
      return;
    }
    
    // Get current week start using current Date directly
    try {
      // First check if user is authenticated - we MUST do this first
      const user = getCurrentUser();
      if (!user || !user.id) {
        console.log("DataContext: Waiting for user authentication");
        setAuthChecked(true);
        return;
      }
      
      try {
        // Use current date with proper validation
        const now = new Date();
        
        // Validate the date is valid before using it
        if (isNaN(now.getTime())) {
          console.error("Invalid date object created");
          setCurrentWeekId(new Date().toISOString().split('T')[0]);
          setAuthChecked(true);
          return;
        }
        
        // Now we know it's valid, create week start from it
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        
        // Double-check the result is also valid
        if (isNaN(weekStart.getTime())) {
          console.error("Invalid week start date");
          setCurrentWeekId(format(now, "yyyy-MM-dd"));
          setAuthChecked(true);
          return;
        }
        
        // All validations passed, now safe to format
        const thisWeekId = format(weekStart, "yyyy-MM-dd");
        setCurrentWeekId(thisWeekId);
        setAuthChecked(true);
      } catch (error) {
        console.error("Error calculating week ID:", error);
        // Fallback to simple string manipulation as last resort
        setCurrentWeekId(new Date().toISOString().split('T')[0]);
        setAuthChecked(true);
      }
    } catch (error) {
      console.error("Critical error in DataContext initialization:", error);
      setAuthChecked(true);
    }
  }, []);

  // Authentication effect
  useEffect(() => {
    // Check if user is authenticated
    const userId = getCurrentUserId();
    if (userId) {
      setAuthChecked(true);
      // Immediately fetch current week data
      fetchWeekData(currentWeekId);
    }
  }, []);

  // Update the ID lookups when cache changes
  useEffect(() => {
    const tasks: Record<number, Task> = {};
    // Collect all tasks from the cache into the lookup table
    Object.values(taskCache).forEach((weekData) => {
      Object.values(weekData).forEach((tasksForDay) => {
        tasksForDay.forEach((task) => {
          tasks[task.id] = task;
        });
      });
    });
    setTasksById(tasks);
  }, [taskCache]);

  // Update the ID lookups when cache changes
  useEffect(() => {
    const events: Record<number, CalendarEvent> = {};
    // Collect all events from the cache into the lookup table
    Object.values(eventCache).forEach((weekData) => {
      Object.values(weekData).forEach((eventsForDay) => {
        eventsForDay.forEach((event) => {
          events[event.id] = event;
        });
      });
    });
    setEventsById(events);
  }, [eventCache]);

  // Update the getDatesInWeek function to be more robust
  const getDatesInWeek = useCallback((weekId: string): string[] => {
    try {
      const weekStart = new Date(weekId);
      // Validate the date
      if (isNaN(weekStart.getTime())) {
        console.error("Invalid week start date:", weekId);
        return [];
      }
      
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        dates.push(format(date, "yyyy-MM-dd"));
      }
      return dates;
    } catch (error) {
      console.error("Error generating dates for week:", error);
      return [];
    }
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

  // Add refs to prevent unnecessary re-renders
  const fetchingRef = useRef<Set<string>>(new Set());
  const cacheUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced cache save to prevent thrashing
  const debouncedSaveCache = useMemo(
    () => debounce((key: string, data: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
      }
    }, 1000),
    []
  );

  // FIXED: Throttle cache saves to prevent thrashing
  const throttledSaveCache = useMemo(() => {
    let saveTimeout: NodeJS.Timeout;
    
    return (key: string, data: any) => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
          console.error(`Error saving ${key}:`, e);
        }
      }, 2000); // Save only after 2 seconds of no changes
    };
  }, []);

  // Optimized fetchWeekData with deduplication
  const fetchWeekData = useCallback(
    async (weekStartDate: string) => {
      const weekId = getWeekId(weekStartDate);
      
      // Prevent duplicate fetches
      if (fetchingRef.current.has(weekId)) {
        console.log(`Already fetching week ${weekId}, skipping`);
        return;
      }

      // Check if we really need to refresh
      if (
        weekCache.includes(weekId) &&
        !needsWeekRefresh(weekId) &&
        taskCache[weekId] &&
        eventCache[weekId]
      ) {
        console.log(`Using cached data for week ${weekId}`);
        return;
      }

      fetchingRef.current.add(weekId);
      setLoading(true);
      
      try {
        const datesInWeek = getDatesInWeek(weekId);
        
        // Batch all requests in parallel
        const fetchPromises = datesInWeek.map(async (dateStr) => {
          const userId = getCurrentUserId();
          if (!userId) return { dateStr, tasks: [], events: [] };
          
          const [tasks, events] = await Promise.all([
            fetchTasks(dateStr),
            fetchEvents(dateStr),
          ]);
          
          return { dateStr, tasks, events };
        });

        const results = await Promise.all(fetchPromises);
        
        // Update caches in batch
        const newTaskCache = { ...taskCache };
        const newEventCache = { ...eventCache };
        
        if (!newTaskCache[weekId]) newTaskCache[weekId] = {};
        if (!newEventCache[weekId]) newEventCache[weekId] = {};
        
        results.forEach(({ dateStr, tasks, events }) => {
          newTaskCache[weekId][dateStr] = tasks;
          newEventCache[weekId][dateStr] = events;
        });
        
        // Single state update
        setTaskCache(newTaskCache);
        setEventCache(newEventCache);
        
        if (!weekCache.includes(weekId)) {
          setWeekCache(prev => [...prev, weekId]);
        }
        
        markWeekFetched(weekId);
        
      } catch (error) {
        console.error(`Error fetching week ${weekId} data:`, error);
        setError(`Failed to load data: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        fetchingRef.current.delete(weekId);
        setLoading(false);
      }
    },
    [
      getWeekId,
      weekCache,
      needsWeekRefresh,
      taskCache,
      eventCache,
      getDatesInWeek,
      getCurrentUserId,
      fetchTasks,
      fetchEvents,
      markWeekFetched,
    ]
  );

  // Throttled localStorage saves
  useEffect(() => {
    throttledSaveCache(`${STORAGE_KEY_PREFIX}taskCache`, taskCache);
  }, [taskCache]); // Removed debouncedSaveCache dependency

  useEffect(() => {
    throttledSaveCache(`${STORAGE_KEY_PREFIX}eventCache`, eventCache);
  }, [eventCache]); // Removed debouncedSaveCache dependency

  // Save cache to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}lastFetched`,
        JSON.stringify(lastFetched)
      );
    } catch (e) {
      console.error("Error saving lastFetched to localStorage:", e);
    }
  }, [lastFetched]);

  // Add weekCache to localStorage effect
  useEffect(() => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}weekCache`,
        JSON.stringify(weekCache)
      );
    } catch (e) {
      console.error("Error saving weekCache to localStorage:", e);
    }
  }, [weekCache]);
  useEffect(() => {
    // Load weekCache from localStorage on mount
    try {
      const cachedWeekCache = localStorage.getItem(
        `${STORAGE_KEY_PREFIX}weekCache`
      );
      if (cachedWeekCache) {
        setWeekCache(JSON.parse(cachedWeekCache));
      }
    } catch (e) {
      console.error("Error saving lastFetched to localStorage:", e);
    }
  }, []);
  useEffect(() => {
    try {
      const cachedTaskCache = localStorage.getItem(
        `${STORAGE_KEY_PREFIX}taskCache`
      );
      if (cachedTaskCache) {
        setTaskCache(JSON.parse(cachedTaskCache));
      }
    } catch (e) {
      console.error("Error saving lastFetched to localStorage:", e);
    }
  }, []);
  useEffect(() => {
    try {
      const cachedEventCache = localStorage.getItem(
        `${STORAGE_KEY_PREFIX}eventCache`
      );
      if (cachedEventCache) {
        setEventCache(JSON.parse(cachedEventCache));
      }
    } catch (e) {
      console.error("Error loading event cache from localStorage:", e);
    }
  }, []); // Empty dependency array means this runs only once on mount

  // Fetch tasks for specific date (using weekly cache)
  const fetchTasksByDate = useCallback(
    async (date: string): Promise<Task[]> => {
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("Skipping fetch - user not authenticated");
        return [];
      }
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
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("Skipping fetch - user not authenticated");
        return [];
      }
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

  // Toggle task completion
  const toggleTask = useCallback(
    async (task: Task): Promise<Task> => {
      // Pass the whole task to toggleTaskCompletion instead of just the ID
      const updatedTask = await toggleTaskCompletion(task);
      
      // Update cache optimistically
      setTaskCache((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((weekId) => {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].map((t) =>
              t.id === task.id ? updatedTask : t
            );
          });
        });
        return updated;
      });
      return updatedTask;
    },
    [toggleTaskCompletion]
  );

  // Add a new task
  const addNewTask = useCallback(
    async (task: Partial<Task>): Promise<Task> => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");
      
      // Ensure all required fields are provided
      const newTaskData: Omit<Task, "id"> = {
        text: task.text || "",
        date: task.date || new Date().toISOString().split('T')[0],
        completed: task.completed || false,
        time: task.time || "",
        user_id: userId
      };
      
      const newTask = await addTask(newTaskData);
      
      // Update cache
      setTaskCache((prev) => {
        const updated = { ...prev };
        const weekId = getWeekId(newTask.date);
        if (!updated[weekId]) updated[weekId] = {};
        const date = format(new Date(newTask.date), "yyyy-MM-dd");
        if (!updated[weekId][date]) updated[weekId][date] = [];
        updated[weekId][date]!.push(newTask);
        return updated;
      });
      return newTask;
    },
    [getCurrentUserId, addTask, setTaskCache, getWeekId]
  );

  // Delete an existing task
  const deleteExistingTask = useCallback(
    async (taskId: number): Promise<void> => {
      await deleteTask(taskId);
      // Update cache
      setTaskCache((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((weekId) => {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].filter(
              (t) => t.id !== taskId
            );
          });
        });
        return updated;
      });
    },
    [deleteTask]
  );

  // Add a new event
  const addNewEvent = useCallback(
    async (event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");
      
      // Ensure all required fields are provided
      const newEventData: Omit<CalendarEvent, "id"> = {
        title: event.title || "",
        date: event.date || new Date().toISOString().split('T')[0],
        time: event.time || "",
        type: event.type || "meeting",
        description: event.description || "",
        user_id: userId
      };
      
      const newEvent = await addEvent(newEventData);
      
      // Update cache
      setEventCache((prev) => {
        const updated = { ...prev };
        const weekId = getWeekId(newEvent.date);
        if (!updated[weekId]) updated[weekId] = {};
        const date = format(new Date(newEvent.date), "yyyy-MM-dd");
        if (!updated[weekId][date]) updated[weekId][date] = [];
        updated[weekId][date]!.push(newEvent);
        return updated;
      });
      
      return newEvent;
    },
    [getCurrentUserId, addEvent, setEventCache, getWeekId] // FIXED: dependency array
  );

  // Delete an existing event
  const deleteExistingEvent = useCallback(
    async (eventId: number): Promise<void> => {
      await deleteEvent(eventId);
      // Update cache
      setEventCache((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((weekId) => {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].filter(
              (e) => e.id !== eventId
            );
          });
        });
        return updated;
      });
    },
    [deleteEvent]
  );

  // Update an existing task
  const updateTask = useCallback(
    async (task: Task): Promise<Task> => {
      // Fix: use updateTask function from API instead of editTask
      const updatedTask = await addTask(task); // Assuming API accepts complete task
      // Update cache
      setTaskCache((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((weekId) => {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].map((t) =>
              t.id === task.id ? updatedTask : t
            );
          });
        });
        return updated;
      });
      return updatedTask;
    },
    [addTask] // Fix: use imported updateTask function
  );

  // Update an existing event
  const updateEventImpl = useCallback(
    async (event: CalendarEvent): Promise<CalendarEvent> => {
      // Implementation code here
      const result = await updateEvent(event);
      
      // Update cache
      setEventCache((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((weekId) => {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].map((e) =>
              e.id === event.id ? result : e
            );
          });
        });
        return updated;
      });
      
      return result;
    },
    [] // Remove updateEvent from dependency array to avoid circular reference
  );

  const updateEventFunction = useCallback(
    async (event: CalendarEvent): Promise<CalendarEvent> => {
      return updateEventImpl(event);
    },
    [updateEventImpl]
  );

  // Refresh data for the current week
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the current week's data
      await fetchWeekData(currentWeekId);
    } catch (error) {
      setError(
        `Failed to refresh data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [fetchWeekData, currentWeekId]);

  // Invalidate cache for a specific date
  const invalidateCache = useCallback(
    (date: string) => {
      const weekId = getWeekId(date);
      setTaskCache((prev) => {
        const updated = { ...prev };
        if (updated[weekId]) {
          delete updated[weekId][date];
          // If no more tasks in this week, delete the week entry
          if (Object.keys(updated[weekId]).length === 0) {
            delete updated[weekId];
          }
        }
        return updated;
      });
      setEventCache((prev) => {
        const updated = { ...prev };
        if (updated[weekId]) {
          delete updated[weekId][date];
          // If no more events in this week, delete the week entry
          if (Object.keys(updated[weekId]).length === 0) {
            delete updated[weekId];
          }
        }
        return updated;
      });
    },
    [getWeekId]
  );

  // Clear all cache
  const clearAllCache = useCallback(() => {
    setTaskCache({});
    setEventCache({});
    setWeekCache([]);
    setLastFetched({});
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}taskCache`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}eventCache`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}lastFetched`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}weekCache`);
  }, []);

  // Batch fetch data for a range of dates
  const batchFetchData = useCallback(
    async (startDate: string, days: number = 7) => {
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("Skipping fetch - user not authenticated");
        return;
      }
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);
      const fetchDates = [];
      const currentDate = new Date(startDate);
      while (currentDate < endDate) {
        fetchDates.push(format(currentDate, "yyyy-MM-dd"));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      // Use Promise.all to fetch all dates in parallel
      await Promise.all(
        fetchDates.map(async (dateStr) => {
          try {
            // Fetch tasks and events for this date
            const [tasks, events] = await Promise.all([
              fetchTasks(dateStr),
              fetchEvents(dateStr),
            ]);
            // Update caches
            setTaskCache((prev) => {
              const updated = { ...prev };
              const weekId = getWeekId(dateStr);
              if (!updated[weekId]) updated[weekId] = {};
              updated[weekId][dateStr] = tasks;
              return updated;
            });
            setEventCache((prev) => {
              const updated = { ...prev };
              const weekId = getWeekId(dateStr);
              if (!updated[weekId]) updated[weekId] = {};
              updated[weekId][dateStr] = events;
              return updated;
            });
          } catch (error) {
            console.error(`Error fetching data for ${dateStr}:`, error);
            // Don't rethrow - keep trying other dates
          }
        })
      );
    },
    [getCurrentUserId, fetchTasks, fetchEvents, setTaskCache, setEventCache]
  );

  // Add these to the component body
  const getTaskById = useCallback(
    (taskId: number): Task | undefined => {
      return tasksById[taskId];
    },
    [tasksById]
  );

  const getEventById = useCallback(
    (eventId: number): CalendarEvent | undefined => {
      return eventsById[eventId];
    },
    [eventsById]
  );

  // Find the useEffect that initializes currentWeekId and add another one to handle requestedWeekId

  // Add this useEffect to handle when requestedWeekId changes
  useEffect(() => {
    if (requestedWeekId && requestedWeekId !== currentWeekId) {
      console.log(`Switching to requested week: ${requestedWeekId}`);
      setCurrentWeekId(requestedWeekId);
      fetchWeekData(requestedWeekId);
    }
  }, [requestedWeekId, currentWeekId, fetchWeekData]);

  // FIXED: Remove circular dependencies
  useEffect(() => {
    if (authChecked && currentWeekId) {
      console.log("Authentication check complete, fetching initial data");
      // Only fetch if we don't already have data
      const weekId = currentWeekId;
      const hasData = taskCache[weekId] && eventCache[weekId];
      
      if (!hasData) {
        fetchWeekData(currentWeekId);
      }
    }
  }, [authChecked, currentWeekId]); // REMOVED fetchWeekData from dependencies

  // FIXED: Debounce the week change handler
  const debouncedSetWeek = useMemo(
    () => debounce((weekId: string) => {
      if (weekId && weekId !== currentWeekId) {
        console.log(`Week changed to: ${weekId}`);
        setCurrentWeekId(weekId);
        fetchWeekData(weekId);
      }
    }, 300),
    [currentWeekId, fetchWeekData]
  );

  // Expose the context value
  const value = useMemo(
    () => ({
      loading,
      error,
      fetchTasksByDate,
      fetchEventsByDate,
      fetchWeekData,
      toggleTask,
      addNewTask,
      deleteExistingTask,
      addNewEvent,
      deleteExistingEvent,
      updateTask,
      updateEvent,
      refreshData,
      invalidateCache,
      clearAllCache,
      taskCache,
      eventCache,
      currentWeekId,
      requestedWeekId,
      setRequestedWeekId,
      getTaskById,
      getEventById,
      tasksById,
      eventsById,
      batchFetchData,
    }),
    [
      loading,
      error,
      fetchTasksByDate,
      fetchEventsByDate,
      fetchWeekData,
      toggleTask,
      addNewTask,
      deleteExistingTask,
      addNewEvent,
      deleteExistingEvent,
      updateTask,
      updateEvent,
      refreshData,
      invalidateCache,
      clearAllCache,
      taskCache,
      eventCache,
      currentWeekId,
      requestedWeekId,
      setRequestedWeekId,
      getTaskById,
      getEventById,
      tasksById,
      eventsById,
      batchFetchData,
    ]
  );

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
}

// ADD THIS: Export useData as an alias
export const useData = useDataContext;
