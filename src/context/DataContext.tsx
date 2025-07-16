// Pure CRUD operations
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import type { Task, RecurringTask } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import { getCurrentUserId } from "../utils/auth";
import { systemNotificationService } from "../services/SystemNotificationService";

// Pure CRUD interface
interface DataContextType {
  // CRUD Operations (direct SQLite calls)
  createTask: (task: Omit<Task, "id">) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
  toggleTask: (task: Task) => Promise<Task>;
  // Recurring Task Operations
  createRecurringTask: (
    recurringTask: Omit<RecurringTask, "id">,
  ) => Promise<RecurringTask>;
  getRecurringTasks: () => Promise<RecurringTask[]>;
  updateRecurringTask: (
    id: number,
    updates: Partial<RecurringTask>,
  ) => Promise<RecurringTask>;
  deleteRecurringTask: (id: number) => Promise<void>;
  generateTodaysRecurringTasks: (
    targetDate?: string,
  ) => Promise<{ success: boolean; createdTasks: number }>;
  handleRecurringTaskCompletion: (
    taskId: number,
  ) => Promise<{ success: boolean; task?: any; message: string }>;

  createEvent: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent>;
  updateEvent: (event: CalendarEvent) => Promise<CalendarEvent>;
  deleteEvent: (eventId: number) => Promise<void>;

  // Data Fetching (for components that need it)
  fetchDayData: (
    date: string,
    page?: number,
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

  // Define generateTodaysRecurringTasks before useEffect that uses it
  const generateTodaysRecurringTasks = useCallback(
    async (
      targetDate?: string,
    ): Promise<{ success: boolean; createdTasks: number }> => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        const date = targetDate || new Date().toISOString().split("T")[0];
        console.log(`DataContext: Generating recurring tasks for ${date}`);

        const result = await window.electronAPI.db.generateRecurringTasks(
          userId,
          date,
        );
        console.log(
          `DataContext: Generated ${result.createdTasks} recurring tasks for ${date}`,
        );

        return {
          success: result.success,
          createdTasks: result.createdTasks,
        };
      } catch (error) {
        console.error("DataContext: Error generating recurring tasks:", error);
        return { success: false, createdTasks: 0 };
      }
    },
    [],
  );

  // Auto-generate recurring tasks on app startup/authentication
  useEffect(() => {
    const autoGenerateRecurringTasks = async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          console.log(
            "DataContext: No authenticated user, skipping auto-generation",
          );
          return;
        }

        console.log(
          "DataContext: Auto-generating recurring tasks on startup for user:",
          userId,
        );

        // Generate recurring tasks for today
        const result = await generateTodaysRecurringTasks();

        if (result.success && result.createdTasks > 0) {
          console.log(
            `DataContext: Auto-generated ${result.createdTasks} recurring tasks on startup`,
          );

          // Dispatch refresh event for dashboard and other components
          window.dispatchEvent(new CustomEvent("dashboard-refresh"));
          window.dispatchEvent(new CustomEvent("tasks-updated"));
        } else {
          console.log("DataContext: No new recurring tasks needed for today");
        }
      } catch (error) {
        console.error(
          "DataContext: Error auto-generating recurring tasks:",
          error,
        );
        // Don't set error state as this is not critical to app functionality
      }
    };

    // Small delay to ensure authentication is properly established
    const timeoutId = setTimeout(autoGenerateRecurringTasks, 1000);

    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array - only run once on mount

  // Auto-generate recurring tasks when date changes (for users who keep app open overnight)
  useEffect(() => {
    let lastCheckedDate = new Date().toISOString().split("T")[0];

    const checkDateChange = async () => {
      const currentDate = new Date().toISOString().split("T")[0];

      if (currentDate !== lastCheckedDate) {
        console.log(
          `DataContext: Date changed from ${lastCheckedDate} to ${currentDate}`,
        );

        const userId = getCurrentUserId();
        if (userId) {
          try {
            const result = await generateTodaysRecurringTasks(currentDate);
            if (result.success && result.createdTasks > 0) {
              console.log(
                `DataContext: Auto-generated ${result.createdTasks} recurring tasks for new date`,
              );

              // Refresh all relevant components
              window.dispatchEvent(new CustomEvent("dashboard-refresh"));
              window.dispatchEvent(new CustomEvent("tasks-updated"));
              window.dispatchEvent(
                new CustomEvent("date-changed", {
                  detail: { newDate: currentDate },
                }),
              );
            }
          } catch (error) {
            console.error(
              "DataContext: Error generating tasks for date change:",
              error,
            );
          }
        }

        lastCheckedDate = currentDate;
      }
    };

    // Check for date changes every minute
    const intervalId = setInterval(checkDateChange, 60000);

    return () => clearInterval(intervalId);
  }, [generateTodaysRecurringTasks]);

  // Create Task using direct SQLite
  const createTask = useCallback(
    async (task: Omit<Task, "id">): Promise<Task> => {
      setLoading(true);
      try {
        console.log("DataContext: Creating task with data:", task);

        // Get user ID
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        } // Complete data sanitization for SQLite
        const sanitizedTask = {
          title: String(task.title || ""),
          task_date: String(task.task_date || ""),
          task_time: String(task.task_time || ""),
          completed: Boolean(task.completed || false),
          user_id: String(userId),
          task_type: task.task_type ? String(task.task_type) : undefined,
          due_date: task.due_date ? String(task.due_date) : undefined,
          status: task.status ? String(task.status) : undefined,
          last_reset_date: task.last_reset_date
            ? String(task.last_reset_date)
            : undefined,
          recurring_id: task.recurring_id
            ? Number(task.recurring_id)
            : undefined,
        }; // Remove any React/IPC artifacts that might be present
        Object.keys(sanitizedTask).forEach((key) => {
          if (sanitizedTask[key as keyof typeof sanitizedTask] === undefined) {
            delete sanitizedTask[key as keyof typeof sanitizedTask];
          }
        });

        console.log(
          "DataContext: Sending sanitized task to SQLite:",
          sanitizedTask,
        );

        // Create via SQLite with sanitized data
        const newTask = await window.electronAPI.db.saveTask(sanitizedTask);

        console.log(`DataContext: Task ${newTask.id} created successfully`);

        // Dispatch event for OSNotificationManager
        window.dispatchEvent(
          new CustomEvent("task-created", {
            detail: newTask,
          }),
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
    [],
  );

  // Update Task using direct SQLite
  const updateTask = useCallback(async (task: Task): Promise<Task> => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");

      console.log(`DataContext: Updating task ${task.id}`); // Ensure all values are proper SQLite types with undefined instead of null for TypeScript compatibility
      const updates = {
        title: String(task.title || ""),
        task_date: String(task.task_date || ""),
        task_time: task.task_time ? String(task.task_time) : undefined,
        completed: Boolean(task.completed),
        failed: Boolean(task.failed),
        task_type: task.task_type ? String(task.task_type) : undefined,
        due_date: task.due_date ? String(task.due_date) : undefined,
        status: task.status ? String(task.status) : undefined,
        updated_at: String(new Date().toISOString()),
      };

      const updatedTask = await window.electronAPI.db.updateTask(
        Number(task.id),
        updates,
      );

      if (!updatedTask) {
        throw new Error("Failed to update task");
      }
      console.log(`DataContext: Task ${task.id} updated successfully`);

      // Send congratulation notification if task was just completed
      if (updatedTask.completed && !task.completed) {
        try {
          await systemNotificationService.showTaskCompletion(updatedTask.title);
          console.log(
            `WINGMAN SUCCESS: Congratulation notification sent for updated task: ${updatedTask.title}`,
          );
        } catch (error) {
          console.error(
            "WINGMAN ERROR: Failed to send congratulation notification:",
            error,
          );
        }
      }

      // Dispatch event for OSNotificationManager
      window.dispatchEvent(
        new CustomEvent("task-updated", {
          detail: updatedTask,
        }),
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

  // Delete Task using direct SQLite
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
        }),
      );
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle Task using direct SQLite
  const toggleTask = useCallback(
    async (task: Task): Promise<Task> => {
      try {
        const updatedTask = await updateTask({
          ...task,
          completed: !task.completed,
          updated_at: new Date().toISOString(),
        }); // If task was completed, dispatch completion event
        if (updatedTask.completed) {
          // Send immediate congratulation notification
          try {
            await systemNotificationService.showTaskCompletion(
              updatedTask.title,
            );
            console.log(
              `WINGMAN SUCCESS: Congratulation notification sent for task: ${updatedTask.title}`,
            );
          } catch (error) {
            console.error(
              "WINGMAN ERROR: Failed to send congratulation notification:",
              error,
            );
          }

          window.dispatchEvent(
            new CustomEvent("task-completed", {
              detail: { taskId: updatedTask.id, title: updatedTask.title },
            }),
          );
        }

        return updatedTask;
      } catch (error) {
        console.error("Error toggling task:", error);
        throw error;
      }
    },
    [updateTask],
  );

  // Create Event using direct SQLite
  const createEvent = useCallback(
    async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
      setLoading(true);
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Match  actual SQLite schema
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
          }),
        );

        return newEvent;
      } catch (error) {
        console.error("Error creating event:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Update Event using direct SQLite
  const updateEvent = useCallback(
    async (event: CalendarEvent): Promise<CalendarEvent> => {
      setLoading(true);
      try {
        // Update in SQLite
        const updatedEvent = await window.electronAPI.db.updateEvent(event);

        console.log(`DataContext: Event ${event.id} updated successfully`);

        // Dispatch event for OSNotificationManager
        window.dispatchEvent(
          new CustomEvent("event-updated", {
            detail: updatedEvent,
          }),
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
    [],
  );

  // Delete Event using direct SQLite
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
        }),
      );
    } catch (error) {
      console.error("Error deleting event:", error);
      setError("Failed to delete event");
      throw error;
    } finally {
      setLoading(false);
    }
  }, []); // Fetch Day Data using SQLite (unchanged - works perfectly)
  const fetchDayData = useCallback(async (date: string) => {
    try {
      // Get user ID
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      console.log(
        `DataContext: Fetching data for ${date} with user_id: ${userId} (SQLite)`,
      );

      // Auto-generate recurring tasks for this date (runs silently)
      try {
        await window.electronAPI.db.generateRecurringTasks(userId, date);
      } catch (recurringError) {
        console.error(
          "DataContext: Error generating recurring tasks:",
          recurringError,
        );
        // continue with normal data fetch
      }

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
        `DataContext: Fetched ${tasks.length} tasks, ${events.length} events for ${date} (SQLite)`,
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

  // Recurring Task Operations
  const createRecurringTask = useCallback(
    async (
      recurringTask: Omit<RecurringTask, "id">,
    ): Promise<RecurringTask> => {
      setLoading(true);
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        console.log("DataContext: Creating recurring task:", recurringTask);

        const sanitizedRecurringTask = {
          user_id: String(userId),
          task_title: String(recurringTask.task_title || ""),
          task_time: recurringTask.task_time
            ? String(recurringTask.task_time)
            : undefined,
          weekdays: Array.isArray(recurringTask.weekdays)
            ? recurringTask.weekdays
            : [],
          is_active: Boolean(recurringTask.is_active !== false), // Default to true
        };

        const newRecurringTask = await window.electronAPI.db.saveRecurringTask(
          sanitizedRecurringTask,
        );
        console.log(
          `DataContext: Recurring task ${newRecurringTask.id} created successfully`,
        );

        return newRecurringTask;
      } catch (error) {
        console.error("DataContext: Error creating recurring task:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create recurring task";
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getRecurringTasks = useCallback(async (): Promise<RecurringTask[]> => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      console.log("DataContext: Fetching recurring tasks for user:", userId);
      const recurringTasks =
        await window.electronAPI.db.getRecurringTasks(userId);
      console.log(
        `DataContext: Fetched ${recurringTasks.length} recurring tasks`,
      );

      return recurringTasks || [];
    } catch (error) {
      console.error("DataContext: Error fetching recurring tasks:", error);
      return [];
    }
  }, []);

  const updateRecurringTask = useCallback(
    async (
      id: number,
      updates: Partial<RecurringTask>,
    ): Promise<RecurringTask> => {
      setLoading(true);
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        console.log(`DataContext: Updating recurring task ${id}:`, updates);

        const sanitizedUpdates = {
          task_title: updates.task_title
            ? String(updates.task_title)
            : undefined,
          task_time: updates.task_time ? String(updates.task_time) : undefined,
          weekdays: Array.isArray(updates.weekdays)
            ? updates.weekdays
            : undefined,
          is_active:
            updates.is_active !== undefined
              ? Boolean(updates.is_active)
              : undefined,
        };

        // Remove undefined values
        Object.keys(sanitizedUpdates).forEach((key) => {
          if (
            sanitizedUpdates[key as keyof typeof sanitizedUpdates] === undefined
          ) {
            delete sanitizedUpdates[key as keyof typeof sanitizedUpdates];
          }
        });

        const updatedRecurringTask =
          await window.electronAPI.db.updateRecurringTask(id, sanitizedUpdates);
        console.log(`DataContext: Recurring task ${id} updated successfully`);

        return updatedRecurringTask;
      } catch (error) {
        console.error("DataContext: Error updating recurring task:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update recurring task";
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const deleteRecurringTask = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      console.log(
        `DataContext: Deleting recurring task ${id} - this may take a moment for templates with many generated tasks`,
      );

      const result = await window.electronAPI.db.deleteRecurringTask(id);

      if (!result.success) {
        throw new Error(result.error || "Failed to delete recurring task");
      }

      console.log(
        `DataContext: Recurring task ${id} deleted successfully. Removed ${
          result.deletedTasks || 0
        } generated tasks.`,
      );
    } catch (error) {
      console.error("DataContext: Error deleting recurring task:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete recurring task";
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRecurringTaskCompletion = useCallback(
    async (
      taskId: number,
    ): Promise<{ success: boolean; task?: any; message: string }> => {
      try {
        const userId = getCurrentUserId();
        if (!userId) {
          throw new Error("User not authenticated");
        }

        console.log(
          `DataContext: Handling completion for recurring task ${taskId}`,
        );
        const result =
          await window.electronAPI.db.handleRecurringTaskCompletion(taskId);
        console.log(
          `DataContext: Recurring task completion handled for ${taskId}:`,
          result,
        );

        // Check if we need to generate tomorrow's recurring tasks
        if (result.success && result.task?.recurring_id) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowDate = tomorrow.toISOString().split("T")[0];

          console.log(
            `DataContext: Checking if recurring task needs generation for ${tomorrowDate}`,
          );

          // Generate recurring tasks for tomorrow to ensure continuity
          try {
            const generateResult =
              await generateTodaysRecurringTasks(tomorrowDate);
            if (generateResult.success && generateResult.createdTasks > 0) {
              console.log(
                `DataContext: Pre-generated ${generateResult.createdTasks} recurring tasks for tomorrow`,
              );
            }
          } catch (genError) {
            console.warn(
              "DataContext: Could not pre-generate tomorrow's recurring tasks:",
              genError,
            );
            // Non-critical error, continue normally
          }
        }

        return result;
      } catch (error) {
        console.error(
          "DataContext: Error handling recurring task completion:",
          error,
        );
        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to handle recurring task completion",
        };
      }
    },
    [generateTodaysRecurringTasks],
  );
  // Clean value object - removed all cache-related properties
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
    createRecurringTask,
    getRecurringTasks,
    updateRecurringTask,
    deleteRecurringTask,
    generateTodaysRecurringTasks,
    handleRecurringTaskCompletion,
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
