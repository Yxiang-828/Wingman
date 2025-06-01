import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
// Remove the api import - we're going direct to SQLite
// import { api } from "../api/apiClient";
import { getCurrentUserId } from "../utils/auth";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";

interface CrudOperation {
  type: "CREATE" | "UPDATE" | "DELETE" | "TOGGLE" | "ROLLBACK" | "ERROR"; // ADD ERROR
  entity: "TASK" | "EVENT";
  data: any;
  affectedDate?: string;
}

type CacheUpdateCallback = (operation: CrudOperation) => void;

interface DataContextType {
  // CRUD Operations (now goes to SQLite + broadcasts)
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
  toggleTask: (task: Task) => Promise<Task>;

  createEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  updateEvent: (event: CalendarEvent) => Promise<CalendarEvent>;
  deleteEvent: (eventId: number) => Promise<void>;

  // Data Fetching (for primary cache owners only)
  fetchDayData: (
    date: string,
    page?: number
  ) => Promise<{
    tasks: Task[];
    events: CalendarEvent[];
    hasMore: { tasks: boolean; events: boolean };
  }>;

  // Cache Update Broadcasting
  subscribeToCacheUpdates: (
    componentId: string,
    callback: CacheUpdateCallback
  ) => void;
  unsubscribeFromCacheUpdates: (componentId: string) => void;

  // Loading state
  loading: boolean;
  error: string | null;

  // ADD THESE MISSING PROPERTIES:
  taskCache: Record<string, Task[]>;
  currentWeekId: string | null;
  fetchWeekData: (weekId: string) => Promise<void>;
}

class CacheUpdateBroadcaster {
  private subscribers = new Map<string, CacheUpdateCallback>();

  subscribe(componentId: string, callback: CacheUpdateCallback): void {
    this.subscribers.set(componentId, callback);
    console.log(`📡 ${componentId} subscribed to cache updates`);
  }

  unsubscribe(componentId: string): void {
    this.subscribers.delete(componentId);
    console.log(`📡 ${componentId} unsubscribed from cache updates`);
  }

  broadcast(operation: CrudOperation): void {
    console.log(
      `📡 Broadcasting ${operation.type} for ${operation.entity}:`,
      operation.data
    );

    this.subscribers.forEach((callback, componentId) => {
      try {
        callback(operation);
      } catch (error) {
        console.error(`📡 Error in ${componentId} cache update:`, error);
      }
    });
  }
}

const broadcaster = new CacheUpdateBroadcaster();

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: Create Task using SQLite with proper data sanitization
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
        const value = (sanitizedTask as any)[key];
        if (
          key.startsWith("_") ||
          typeof value === "function" ||
          (typeof value === "object" && value !== null && !Array.isArray(value))
        ) {
          delete (sanitizedTask as any)[key];
        }
      });

      console.log(
        "📤 DataContext: Sending sanitized task to SQLite:",
        sanitizedTask
      );

      // Create via SQLite with sanitized data
      const savedTask = await window.electronAPI.db.saveTask(sanitizedTask);

      console.log("✅ DataContext: Task created successfully:", savedTask);

      // ✅ FIXED: Broadcast with proper structure
      broadcaster.broadcast({
        type: "CREATE",
        entity: "TASK",
        data: savedTask,
        affectedDate: savedTask.task_date,
      });

      return savedTask;
    } catch (error) {
      console.error("❌ DataContext: Error creating task:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create task";
      setError(errorMessage);

      // Broadcast failure for rollback
      broadcaster.broadcast({
        type: "ERROR",
        entity: "TASK",
        data: { error: errorMessage },
        affectedDate: task.task_date,
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ NEW: Update Task using SQLite
  const updateTask = useCallback(async (task: Task): Promise<Task> => {
    setLoading(true);
    setError(null);

    try {
      // ONLY broadcast optimistic update with special flag
      broadcaster.broadcast({
        type: "UPDATE",
        entity: "TASK",
        data: { ...task, _isOptimistic: true }, // Add flag
        affectedDate: task.task_date,
      });

      // ✅ CHANGED: Update in SQLite instead of API
      const updatedTask = await window.electronAPI.db.updateTask(task.id, task);

      // Don't broadcast again, just return the result
      const finalTask = updatedTask || task;
      console.log(`✅ Task updated in SQLite:`, finalTask);
      return finalTask;
    } catch (error) {
      console.error("❌ Error updating task:", error);
      setError("Failed to update task");

      // Broadcast rollback on error
      broadcaster.broadcast({
        type: "ROLLBACK",
        entity: "TASK",
        data: task,
        affectedDate: task.task_date,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ NEW: Delete Task using SQLite
  const deleteTask = useCallback(async (taskId: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Broadcast optimistic delete immediately
      broadcaster.broadcast({
        type: "DELETE",
        entity: "TASK",
        data: { id: taskId },
      });

      // ✅ CHANGED: Delete from SQLite instead of API
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

  // ✅ NEW: Toggle Task using SQLite
  const toggleTask = useCallback(async (task: Task): Promise<Task> => {
    setLoading(true);
    setError(null);

    try {
      // Create a copy with toggled status
      const toggledTask = {
        ...task,
        completed: !task.completed,
        // Ensure consistent field names
        task_date: task.task_date,
        task_time: task.task_time || "",
      };

      // Broadcast optimistic update immediately with special flag
      broadcaster.broadcast({
        type: "UPDATE",
        entity: "TASK",
        data: { ...toggledTask, _isOptimistic: true },
        affectedDate: toggledTask.task_date,
      });

      // ✅ CHANGED: Update in SQLite instead of API
      const updatedTask = await window.electronAPI.db.updateTask(task.id, {
        completed: !task.completed,
      });

      // Create final version
      const finalTask = updatedTask || toggledTask;

      // Broadcast update to all components
      broadcaster.broadcast({
        type: "UPDATE",
        entity: "TASK",
        data: finalTask,
        affectedDate: finalTask.task_date,
      });

      console.log(`✅ Task ${task.id} toggled in SQLite:`, finalTask);
      return finalTask;
    } catch (error) {
      console.error("❌ Error toggling task:", error);
      setError("Failed to update task");

      // Broadcast rollback
      broadcaster.broadcast({
        type: "ROLLBACK",
        entity: "TASK",
        data: task,
        affectedDate: task.task_date,
      });

      // Return original state
      return task;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ NEW: Create Event using SQLite
  const createEvent = useCallback(
    async (event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // ✅ MATCH YOUR ACTUAL SQLITE SCHEMA - Don't set created_at/updated_at
        const eventData = {
          title: event.title || "",
          event_date: event.event_date || "",
          event_time: event.event_time || "",
          type: event.type || "Personal",
          description: event.description || "",
          user_id: userId
          // ✅ NO created_at/updated_at - SQLite handles with CURRENT_TIMESTAMP
        };

        // Check window.electronAPI is available
        if (!window.electronAPI?.db) {
          throw new Error("ElectronAPI database not available");
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

  // ✅ NEW: Update Event using SQLite
  const updateEvent = useCallback(
    async (event: CalendarEvent): Promise<CalendarEvent> => {
      setLoading(true);
      setError(null);

      try {
        broadcaster.broadcast({
          type: "UPDATE",
          entity: "EVENT",
          data: event,
          affectedDate: event.event_date,
        });

        // ✅ CHANGED: Update in SQLite instead of API
        const updatedEvent = await window.electronAPI.db.saveEvent(event);

        const finalEvent = { ...event, ...updatedEvent };
        broadcaster.broadcast({
          type: "UPDATE",
          entity: "EVENT",
          data: finalEvent,
          affectedDate: finalEvent.event_date,
        });

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

  // ✅ NEW: Delete Event using SQLite
  const deleteEvent = useCallback(async (eventId: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      broadcaster.broadcast({
        type: "DELETE",
        entity: "EVENT",
        data: { id: eventId },
      });

      // ✅ CHANGED: Delete from SQLite instead of API
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

  // ✅ NEW: Fetch Day Data using SQLite
  const fetchDayData = useCallback(async (date: string, page: number = 1) => {
    try {
      // Get user ID - CRITICAL
      const userId = getCurrentUserId();
      if (!userId) {
        console.warn("fetchDayData: No user ID available");
        return {
          tasks: [],
          events: [],
          hasMore: { tasks: false, events: false },
        };
      }

      console.log(
        `🌐 DataContext: Fetching data for ${date} with user_id: ${userId} (SQLite)`
      );

      // ✅ CHANGED: Get data from SQLite instead of API
      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, date).catch((err) => {
          console.error("Tasks fetch failed:", err);
          return [];
        }),
        window.electronAPI.db.getEvents(userId, date).catch((err) => {
          console.error("Events fetch failed:", err);
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

  // Add to any component with button to debug:
  const debugSQLite = async () => {
    try {
      const userId = getCurrentUserId();
      console.log("Debugging SQLite with userId:", userId);

      // Check database contents
      console.group("📊 SQLite Database Contents");

      // Tasks
      const tasks = await window.electronAPI.db.getTasks(userId);
      console.log("Tasks:", tasks);

      // Events
      const events = await window.electronAPI.db.getEvents(userId);
      console.log("Events:", events);

      // Diary entries
      const diaryEntries = await window.electronAPI.db.getDiaryEntries(userId);
      console.log("Diary entries:", diaryEntries);

      // Chat messages
      const chatHistory = await window.electronAPI.db.getChatHistory(
        userId,
        10
      );
      console.log("Recent chat messages:", chatHistory);

      // Storage stats
      const stats = await window.electronAPI.db.getStorageStats(userId);
      console.log("Storage stats:", stats);

      console.groupEnd();
    } catch (error) {
      console.error("SQLite debug error:", error);
    }
  };

  const value: DataContextType = {
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchDayData,
    subscribeToCacheUpdates: broadcaster.subscribe.bind(broadcaster),
    unsubscribeFromCacheUpdates: broadcaster.unsubscribe.bind(broadcaster),
    loading,
    error,

    // ADD THESE MISSING PROPERTIES:
    taskCache: {} as Record<string, Task[]>,
    currentWeekId: null,
    fetchWeekData: async () => {},
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
