import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { format, startOfWeek } from "date-fns";
import { fetchTasks, addTask as apiAddTask, updateTask as apiUpdateTask, deleteTask } from "../api/Task";
import { fetchEvents, addEvent, updateEvent as apiUpdateEvent, deleteEvent } from "../api/Calendar";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";

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
  getTaskById?: (taskId: number) => Task | undefined;
  getEventById?: (eventId: number) => CalendarEvent | undefined;
  tasksById?: Record<number, Task>;
  eventsById?: Record<number, CalendarEvent>;
}

// Create the data context
const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Centralized cache state - store by week identifier
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
  const [eventsById, setEventsById] = useState<Record<number, CalendarEvent>>({});

  // Track when week data was last fetched
  const [lastFetched, setLastFetched] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}lastFetched`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Get week ID from a date
  const getWeekId = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday as first day
    return format(weekStart, "yyyy-MM-dd");
  }, []);

  // Initialize current week on mount
  useEffect(() => {
    const today = new Date();
    const thisWeekId = format(
      startOfWeek(today, { weekStartsOn: 0 }),
      "yyyy-MM-dd"
    );
    setCurrentWeekId(thisWeekId);

    // Immediately fetch current week data
    fetchWeekData(thisWeekId);
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

  // Get all dates in a week
  const getDatesInWeek = useCallback((weekId: string): string[] => {
    const weekStart = new Date(weekId);
    const dates = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
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

  // Fetch entire week of data
  const fetchWeekData = useCallback(
    async (weekStartDate: string) => {
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
          timeoutPromise,
        ]);

        // Add the week to weekCache if not already there
        if (!weekCache.includes(weekId)) {
          setWeekCache((prev) => [...prev, weekId]);
        }

        // Mark week as fetched
        markWeekFetched(weekId);
      } catch (error) {
        console.error(`Error fetching week ${weekId} data:`, error);
        setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
        setRequestedWeekId(null);
      }
    },
    [
      weekCache,
      taskCache,
      eventCache,
      needsWeekRefresh,
      getDatesInWeek,
      markWeekFetched,
      getWeekId
    ]
  );

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

  // Load weekCache from localStorage on mount
  useEffect(() => {
    try {
      const cachedWeekCache = localStorage.getItem(`${STORAGE_KEY_PREFIX}weekCache`);
      if (cachedWeekCache) {
        setWeekCache(JSON.parse(cachedWeekCache));
      }
      
      const cachedTaskCache = localStorage.getItem(`${STORAGE_KEY_PREFIX}taskCache`);
      if (cachedTaskCache) {
        setTaskCache(JSON.parse(cachedTaskCache));
      }
      
      const cachedEventCache = localStorage.getItem(`${STORAGE_KEY_PREFIX}eventCache`);
      if (cachedEventCache) {
        setEventCache(JSON.parse(cachedEventCache));
      }
    } catch (e) {
      console.error("Error loading cache from localStorage:", e);
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

  // Toggle task completion
  const toggleTask = useCallback(
    async (task: Task): Promise<Task> => {
      const updatedTask = { ...task, completed: !task.completed };
      await apiUpdateTask(updatedTask);
      setTaskCache((prev) => {
        const updated = { ...prev };
        const weekId = getWeekId(task.date);
        if (updated[weekId]) {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].map((t) =>
              t.id === task.id ? updatedTask : t
            );
          });
        }
        return updated;
      });
      return updatedTask;
    },
    [setTaskCache, getWeekId]
  );

  // Add a new task
  const addNewTask = async (taskData: Partial<Task>): Promise<Task> => {
    // Ensure required fields have defaults
    const task: Omit<Task, "id"> = {
      text: taskData.text || "",
      date: taskData.date || new Date().toISOString().split("T")[0],
      completed: taskData.completed || false,
      time: taskData.time || "",
      ...taskData
    };

    try {
      const savedTask = await apiAddTask(task as Omit<Task, "id">);

      // Update cache optimistically
      setTaskCache((prev) => {
        const updated = { ...prev };
        const weekId = getWeekId(savedTask.date);
        if (!updated[weekId]) updated[weekId] = {};
        if (!updated[weekId][savedTask.date]) updated[weekId][savedTask.date] = [];
        updated[weekId][savedTask.date] = [...updated[weekId][savedTask.date], savedTask];
        return updated;
      });

      return savedTask;
    } catch (error) {
      console.error("Error adding new task:", error);
      throw error;
    }
  };

  // Delete an existing task
  const deleteExistingTask = useCallback(
    async (taskId: number) => {
      await deleteTask(taskId);
      setTaskCache((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((weekId) => {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].filter((task) => task.id !== taskId);
          });
        });
        return updated;
      });
    },
    [setTaskCache]
  );

  // Handle allDay property in addNewEvent
  const addNewEvent = async (eventData: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    try {
      // Remove the allDay property if it exists
      const { allDay, ...validEventData } = eventData as any;
      
      // Use the cleaned data
      const response = await addEvent(validEventData);
      
      // Rest of the function remains unchanged
      return response;
    } catch (error) {
      console.error("Error adding event:", error);
      throw error;
    }
  };

  // Delete an existing event
  const deleteExistingEvent = useCallback(
    async (eventId: number) => {
      await deleteEvent(eventId);
      setEventCache((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((weekId) => {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].filter((event) => event.id !== eventId);
          });
        });
        return updated;
      });
    },
    [setEventCache]
  );

  // Update an existing task
  const updateTask = useCallback(
    async (task: Task): Promise<Task> => {
      await apiUpdateTask(task);
      setTaskCache((prev) => {
        const updated = { ...prev };
        const weekId = getWeekId(task.date);
        if (updated[weekId]) {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].map((t) =>
              t.id === task.id ? task : t
            );
          });
        }
        return updated;
      });
      return task;
    },
    [setTaskCache, getWeekId]
  );

  // Update an existing event
  const updateEvent = useCallback(
    async (event: CalendarEvent): Promise<CalendarEvent> => {
      await apiUpdateEvent(event);
      setEventCache((prev) => {
        const updated = { ...prev };
        const weekId = getWeekId(event.date);
        if (updated[weekId]) {
          Object.keys(updated[weekId]).forEach((date) => {
            updated[weekId][date] = updated[weekId][date].map((e) =>
              e.id === event.id ? event : e
            );
          });
        }
        return updated;
      });
      return event;
    },
    [setEventCache, getWeekId]
  );

  // Refresh data for the current week
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await fetchWeekData(currentWeekId);
    } catch (error) {
      console.error("Error refreshing data:", error);
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
        delete updated[weekId];
        return updated;
      });
      setEventCache((prev) => {
        const updated = { ...prev };
        delete updated[weekId];
        return updated;
      });
    },
    [setTaskCache, setEventCache, getWeekId]
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
  }, [setTaskCache, setEventCache, setWeekCache, setLastFetched]);

  // Provide context value
  const value = {
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
    getTaskById: (taskId: number) => tasksById[taskId],
    getEventById: (eventId: number) => eventsById[eventId],
    tasksById,
    eventsById,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook to use the DataContext
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};