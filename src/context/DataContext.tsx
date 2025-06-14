// Data command center - pure CRUD operations for your digital realm
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

// Simplified: Pure CRUD interface - no cache, no subscriptions
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

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified: Create Task using direct SQLite
  const createTask = useCallback(
    async (task: Omit<Task, "id">): Promise<Task> => {
      setLoading(true);
      try {
        console.log("DataContext: Creating task with data:", task);

        // Get user ID
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Complete data sanitization for SQLite
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
          "DataContext: Sending sanitized task to SQLite:",
          sanitizedTask
        );

        // Create via SQLite with sanitized data
        const newTask = await window.electronAPI.db.saveTask(sanitizedTask);

        console.log(`DataContext: Task ${newTask.id} created successfully`);

        // Dispatch event for OSNotificationManager
        window.dispatchEvent(
          new CustomEvent("task-created", {
            detail: newTask,
          })
        );

        return newTask;
      } catch (error) {
        console.error("DataContext: Error creating task:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create task";
        setError(errorMessage);

        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Simplified: Update Task using direct SQLite
  const updateTask = useCallback(async (task: Task): Promise<Task> => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");

      console.log(`DataContext: Updating task ${task.id}`);

      // Fix: Ensure all values are proper SQLite types
      const updates = {
        title: String(task.title || ""),
        task_date: String(task.task_date || ""),
        task_time: task.task_time ? String(task.task_time) : null,
        completed: Boolean(task.completed),
        failed: Boolean(task.failed),
        task_type: task.task_type ? String(task.task_type) : null,
        due_date: task.due_date ? String(task.due_date) : null,
        urgency_level: task.urgency_level ? Number(task.urgency_level) : null,
        status: task.status ? String(task.status) : null,
        updated_at: String(new Date().toISOString()),
      };

      const updatedTask = await window.electronAPI.db.updateTask(
        Number(task.id),
        updates
      );

      if (!updatedTask) {
        throw new Error("Failed to update task");
      }

      console.log(`DataContext: Task ${task.id} updated successfully`);

      // Dispatch event for OSNotificationManager
      window.dispatchEvent(
        new CustomEvent("task-updated", {
          detail: updatedTask,
        })
      );

      return updatedTask;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update task";
      console.error("Error updating task:", error);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Simplified: Delete Task using direct SQLite
  const deleteTask = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    try {
      // Delete from SQLite
      await window.electronAPI.db.deleteTask(id);

      console.log(`DataContext: Task ${id} deleted successfully`);

      // Dispatch event for OSNotificationManager
      window.dispatchEvent(
        new CustomEvent("task-deleted", {
          detail: { taskId: id },
        })
      );
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Simplified: Toggle Task using direct SQLite
  const toggleTask = useCallback(
    async (task: Task): Promise<Task> => {
      try {
        const updatedTask = await updateTask({
          ...task,
          completed: !task.completed,
          updated_at: new Date().toISOString(),
        });

        // If task was completed, dispatch completion event
        if (updatedTask.completed) {
          window.dispatchEvent(
            new CustomEvent("task-completed", {
              detail: { taskId: updatedTask.id, title: updatedTask.title },
            })
          );
        }

        return updatedTask;
      } catch (error) {
        console.error("Error toggling task:", error);
        throw error;
      }
    },
    [updateTask]
  );

  // Simplified: Create Event using direct SQLite
  const createEvent = useCallback(
    async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
      setLoading(true);
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Match your actual SQLite schema
        const eventData = {
          title: event.title || "",
          event_date: event.event_date || "",
          event_time: event.event_time || "",
          type: event.type || "Personal",
          description: event.description || "",
          user_id: userId,
        };

        // Check window.electronAPI is available
        if (!window.electronAPI?.db) {
          throw new Error("Database connection not available");
        }

        const newEvent = await window.electronAPI.db.saveEvent(eventData);
        console.log(`DataContext: Event ${newEvent.id} created successfully`);

        // Dispatch event for OSNotificationManager
        window.dispatchEvent(
          new CustomEvent("event-created", {
            detail: newEvent,
          })
        );

        return newEvent;
      } catch (error) {
        console.error("Error creating event:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Simplified: Update Event using direct SQLite
  const updateEvent = useCallback(
    async (event: CalendarEvent): Promise<CalendarEvent> => {
      setLoading(true);
      try {
        // Update in SQLite
        const updatedEvent = await window.electronAPI.db.updateEvent(event);

        const finalEvent = { ...event, ...updatedEvent };

        console.log(`DataContext: Event ${event.id} updated successfully`);

        // Dispatch event for OSNotificationManager
        window.dispatchEvent(
          new CustomEvent("event-updated", {
            detail: updatedEvent,
          })
        );

        return updatedEvent;
      } catch (error) {
        console.error("Error updating event:", error);
        setError("Failed to update event");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Simplified: Delete Event using direct SQLite
  const deleteEvent = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    try {
      // Delete from SQLite
      await window.electronAPI.db.deleteEvent(id);

      console.log(`DataContext: Event ${id} deleted successfully`);

      // Dispatch event for OSNotificationManager
      window.dispatchEvent(
        new CustomEvent("event-deleted", {
          detail: { eventId: id },
        })
      );
    } catch (error) {
      console.error("Error deleting event:", error);
      setError("Failed to delete event");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep: Fetch Day Data using SQLite (unchanged - works perfectly)
  const fetchDayData = useCallback(async (date: string, page: number = 1) => {
    try {
      // Get user ID - CRITICAL
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      console.log(
        `DataContext: Fetching data for ${date} with user_id: ${userId} (SQLite)`
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
        `DataContext: Fetched ${tasks.length} tasks, ${events.length} events for ${date} (SQLite)`
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
      console.error(`DataContext: Error fetching data for ${date}:`, error);
      return {
        tasks: [],
        events: [],
        hasMore: { tasks: false, events: false },
      };
    }
  }, []);

  // Simplified: Clean value object - removed all cache-related properties
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
