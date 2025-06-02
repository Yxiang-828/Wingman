import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import { getCurrentUserId } from "../utils/auth";

// ✅ SIMPLIFIED: Pure CRUD interface - no cache, no subscriptions
interface DataContextType {
  // CRUD Operations (direct SQLite calls)
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
  toggleTask: (task: Task) => Promise<Task>;

  createEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  updateEvent: (event: CalendarEvent) => Promise<CalendarEvent>;
  deleteEvent: (eventId: number) => Promise<void>;

  // Data Fetching (for components that need it)
  fetchDayData: (
    date: string,
    page?: number
  ) => Promise<{
    tasks: Task[];
    events: CalendarEvent[];
    hasMore: { tasks: boolean; events: boolean };
  }>;

  // Loading state
  loading: boolean;
  error: string | null;
}

// ✅ REMOVED: CacheUpdateBroadcaster class - no longer needed

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ SIMPLIFIED: Create Task using direct SQLite (removed broadcasting)
  const createTask = useCallback(async (task: Partial<Task>): Promise<Task> => {
    setLoading(true);
    setError(null);

    try {
      console.log("📝 DataContext: Creating task with data:", task);

      // Get user ID
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // ✅ COMPLETE DATA SANITIZATION for SQLite
      const sanitizedTask = {
        title: String(task.title || ""),
        task_date: String(task.task_date || ""),
        task_time: String(task.task_time || ""),
        completed: Boolean(task.completed || false),
        user_id: String(userId),
        task_type: task.task_type ? String(task.task_type) : null,
        due_date: task.due_date ? String(task.due_date) : null,
        urgency_level: task.urgency_level ? Number(task.urgency_level) : null,
        status: task.status ? String(task.status) : null,
        last_reset_date: task.last_reset_date
          ? String(task.last_reset_date)
          : null,
      };

      // Remove any React/IPC artifacts that might be present
      Object.keys(sanitizedTask).forEach((key) => {
        if (sanitizedTask[key] === undefined) {
          delete sanitizedTask[key];
        }
      });

      console.log(
        "📤 DataContext: Sending sanitized task to SQLite:",
        sanitizedTask
      );

      // Create via SQLite with sanitized data
      const savedTask = await window.electronAPI.db.saveTask(sanitizedTask);

      console.log("✅ DataContext: Task created successfully:", savedTask);

      // ✅ REMOVED: broadcaster.broadcast() calls - components handle their own refresh

      return savedTask;
    } catch (error) {
      console.error("❌ DataContext: Error creating task:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create task";
      setError(errorMessage);

      // ✅ REMOVED: Error broadcasting - just throw error

      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ SIMPLIFIED: Update Task using direct SQLite (removed optimistic updates)
  const updateTask = useCallback(async (task: Task): Promise<Task> => {
    setLoading(true);
    setError(null);

    try {
      // ✅ REMOVED: Optimistic update broadcasting

      // Update in SQLite
      const updatedTask = await window.electronAPI.db.updateTask(task.id, task);

      const finalTask = updatedTask || task;
      console.log(`✅ Task updated in SQLite:`, finalTask);
      return finalTask;
    } catch (error) {
      console.error("❌ Error updating task:", error);
      setError("Failed to update task");

      // ✅ REMOVED: Rollback broadcasting

      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ SIMPLIFIED: Delete Task using direct SQLite (removed broadcasting)
  const deleteTask = useCallback(async (taskId: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // ✅ REMOVED: Optimistic delete broadcasting

      // Delete from SQLite
      await window.electronAPI.db.deleteTask(taskId);

      console.log(`✅ Task ${taskId} successfully deleted from SQLite`);
    } catch (error) {
      console.error("❌ Error deleting task:", error);
      setError("Failed to delete task");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ SIMPLIFIED: Toggle Task using direct SQLite (removed optimistic updates)
  const toggleTask = useCallback(async (task: Task): Promise<Task> => {
    setLoading(true);
    setError(null);

    try {
      // ✅ REMOVED: Optimistic update broadcasting

      // Update in SQLite
      const updatedTask = await window.electronAPI.db.updateTask(task.id, {
        completed: !task.completed,
      });

      // Create final version
      const finalTask = updatedTask || {
        ...task,
        completed: !task.completed,
      };

      // ✅ REMOVED: Update broadcasting

      console.log(`✅ Task ${task.id} toggled in SQLite:`, finalTask);
      return finalTask;
    } catch (error) {
      console.error("❌ Error toggling task:", error);
      setError("Failed to update task");

      // ✅ REMOVED: Rollback broadcasting

      // Return original state on error
      return task;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ SIMPLIFIED: Create Event using direct SQLite (removed broadcasting)
  const createEvent = useCallback(
    async (event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // ✅ MATCH YOUR ACTUAL SQLITE SCHEMA
        const eventData = {
          title: event.title || "",
          event_date: event.event_date || "",
          event_time: event.event_time || "",
          type: event.type || "Personal",
          description: event.description || "",
          user_id: userId
        };

        // Check window.electronAPI is available
        if (!window.electronAPI?.db) {
          throw new Error("Database connection not available");
        }

        const createdEvent = await window.electronAPI.db.saveEvent(eventData);
        console.log(`✅ Event created in SQLite:`, createdEvent);
        return createdEvent;
      } catch (error) {
        console.error("❌ Error creating event:", error);
        throw error;
      }
    },
    []
  );

  // ✅ SIMPLIFIED: Update Event using direct SQLite (removed broadcasting)
  const updateEvent = useCallback(
    async (event: CalendarEvent): Promise<CalendarEvent> => {
      setLoading(true);
      setError(null);

      try {
        // ✅ REMOVED: Optimistic update broadcasting

        // Update in SQLite
        const updatedEvent = await window.electronAPI.db.saveEvent(event);

        const finalEvent = { ...event, ...updatedEvent };

        // ✅ REMOVED: Update broadcasting

        console.log(`✅ Event updated in SQLite:`, finalEvent);
        return finalEvent;
      } catch (error) {
        console.error("❌ Error updating event:", error);
        setError("Failed to update event");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ✅ SIMPLIFIED: Delete Event using direct SQLite (removed broadcasting)
  const deleteEvent = useCallback(async (eventId: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // ✅ REMOVED: Optimistic delete broadcasting

      // Delete from SQLite
      await window.electronAPI.db.deleteEvent(eventId);

      console.log(`✅ Event ${eventId} successfully deleted from SQLite`);
    } catch (error) {
      console.error("❌ Error deleting event:", error);
      setError("Failed to delete event");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ KEEP: Fetch Day Data using SQLite (unchanged - works perfectly)
  const fetchDayData = useCallback(async (date: string, page: number = 1) => {
    try {
      // Get user ID - CRITICAL
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      console.log(
        `🌐 DataContext: Fetching data for ${date} with user_id: ${userId} (SQLite)`
      );

      // Get data from SQLite
      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, date).catch((err) => {
          console.error("Error fetching tasks:", err);
          return [];
        }),
        window.electronAPI.db.getEvents(userId, date).catch((err) => {
          console.error("Error fetching events:", err);
          return [];
        }),
      ]);

      console.log(
        `✅ DataContext: Fetched ${tasks.length} tasks, ${events.length} events for ${date} (SQLite)`
      );

      return {
        tasks: tasks || [],
        events: events || [],
        hasMore: {
          tasks: tasks.length >= 7,
          events: events.length >= 7,
        },
      };
    } catch (error) {
      console.error(`❌ DataContext: Error fetching data for ${date}:`, error);
      return {
        tasks: [],
        events: [],
        hasMore: { tasks: false, events: false },
      };
    }
  }, []);

  // ✅ SIMPLIFIED: Clean value object - removed all cache-related properties
  const value: DataContextType = {
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchDayData,
    loading,
    error,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};

export const useData = useDataContext; // Alias for compatibility