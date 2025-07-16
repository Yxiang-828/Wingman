/**
 * Task types and utilities
 * For tasks and recurring tasks
 */

/**
 * Represents a task that users can create and track
 */
export interface Task {
  id: number;
  title: string;
  task_date: string; // (YYYY-MM-DD format)
  task_time?: string; // (HH:MM format)
  completed: boolean;
  failed?: boolean;
  user_id?: string | number;
  isProcessing?: boolean;

  // Extra info from the database
  task_type?: string;
  due_date?: string;
  last_reset_date?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  recurring_id?: number; // Is this from a recurring task template?
}

/**
 * Template for tasks that repeat on certain days
 */
export interface RecurringTask {
  id: number;
  user_id: string | number;
  task_title: string;
  task_time?: string;
  weekdays: number[]; // Which days? (0=Sunday, 1=Monday, etc.)
  is_active: boolean;
  created_at?: string;
}

/**
 * Check if a task came from a recurring template
 */
export const isRecurringTask = (task: Task): boolean => {
  return task.recurring_id !== undefined && task.recurring_id !== null;
};

// Helper functions for working with tasks

/**
 * Make sure a task has all the required fields
 */
export const validateTask = (task: Partial<Task>): task is Task => {
  return !!(
    task.id &&
    task.title &&
    task.task_date &&
    typeof task.completed === "boolean"
  );
};

/**
 * Create a new task with today's date as default
 */
export const createDefaultTask = (
  overrides: Partial<Task> = {},
): Omit<Task, "id"> => {
  const today = new Date().toISOString().split("T")[0];

  return {
    title: "",
    task_date: today,
    task_time: "",
    completed: false,
    ...overrides,
  };
};

/**
 * Check if a task is due today
 */
export const isTaskDueToday = (task: Task): boolean => {
  const today = new Date().toISOString().split("T")[0];
  return task.task_date === today;
};

/**
 * Check if a task is overdue
 */
export const isTaskOverdue = (task: Task): boolean => {
  const today = new Date().toISOString().split("T")[0];
  return task.task_date < today && !task.completed;
};

/**
 * Format task time for display
 */
export const formatTaskTime = (task: Task): string => {
  if (!task.task_time) return "";

  try {
    const time = new Date(`2000-01-01T${task.task_time}`);
    return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return task.task_time;
  }
};

// Type utilities for external use
export type TaskWithoutId = Omit<Task, "id">;
export type TaskUpdate = Partial<Task>;
export type TaskValidation = {
  isValid: boolean;
  errors: string[];
};
