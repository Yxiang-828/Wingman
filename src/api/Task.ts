/**
 * Task API - Hybrid Architecture Migration
 * Tasks now handled by SQLite via DataContext for improved performance
 * This file provides type definitions and migration utilities
 */

/**
 * Task interface - Compatible with both Supabase and SQLite schemas
 * Represents a user task with scheduling and completion tracking
 */
export interface Task {
  id: number;
  title: string;        // Task title - maps to tasks.title in schema
  task_date: string;    // Date in YYYY-MM-DD format - maps to tasks.task_date
  task_time?: string;   // Optional time in HH:MM format - maps to tasks.task_time
  completed: boolean;   // Completion status - maps to tasks.completed
  user_id?: string | number; // User identifier - maps to tasks.user_id
  isProcessing?: boolean; // Frontend-only field for UI loading states
  
  // Extended fields from database schema
  task_type?: string;
  due_date?: string;
  last_reset_date?: string;
  urgency_level?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// Migration notice for developers
console.warn('MIGRATION NOTICE: Task API operations moved to DataContext + SQLite');
console.info('USE INSTEAD: useDataContext() for createTask, updateTask, deleteTask, toggleTask');

/**
 * Legacy API functions - All deprecated
 * These functions throw errors to guide migration to DataContext
 */

export const fetchTasks = async (date: string): Promise<Task[]> => {
  const errorMsg = `fetchTasks() is DEPRECATED. Use DataContext.fetchDayData() instead.
  
BEFORE: fetchTasks('${date}')
AFTER:  const { fetchDayData } = useDataContext();
        const { tasks } = await fetchDayData('${date}');`;
        
  console.error(errorMsg);
  throw new Error('fetchTasks() moved to DataContext.fetchDayData() - check console for migration guide');
};

export const addTask = async (_task: Omit<Task, "id">): Promise<Task> => {
  const errorMsg = `addTask() is DEPRECATED. Use DataContext.createTask() instead.
  
BEFORE: addTask(taskData)
AFTER:  const { createTask } = useDataContext();
        const newTask = await createTask(taskData);`;
        
  console.error(errorMsg);
  throw new Error('addTask() moved to DataContext.createTask()');
};

export const updateTask = async (_task: Task): Promise<Task> => {
  const errorMsg = `updateTask() is DEPRECATED. Use DataContext.updateTask() instead.
  
BEFORE: updateTask(taskData)
AFTER:  const { updateTask } = useDataContext();
        const updatedTask = await updateTask(taskData);`;
        
  console.error(errorMsg);
  throw new Error('updateTask() moved to DataContext.updateTask()');
};

export const deleteTask = async (id: number): Promise<void> => {
  const errorMsg = `deleteTask() is DEPRECATED. Use DataContext.deleteTask() instead.
  
BEFORE: deleteTask(${id})
AFTER:  const { deleteTask } = useDataContext();
        await deleteTask(${id});`;
        
  console.error(errorMsg);
  throw new Error('deleteTask() moved to DataContext.deleteTask() - check console for migration guide');
};

export const toggleTaskCompletion = async (_task: Task): Promise<Task> => {
  const errorMsg = `toggleTaskCompletion() is DEPRECATED. Use DataContext.toggleTask() instead.
  
BEFORE: toggleTaskCompletion(task)
AFTER:  const { toggleTask } = useDataContext();
        const toggledTask = await toggleTask(task);`;
        
  console.error(errorMsg);
  throw new Error('toggleTaskCompletion() moved to DataContext.toggleTask()');
};

/**
 * Utility Functions - Still active and useful
 * These provide validation and helper functionality for task management
 */

/**
 * Validates that a task object contains all required fields
 * @param task - Partial task object to validate
 * @returns True if task is valid, false otherwise
 */
export const validateTask = (task: Partial<Task>): task is Task => {
  return !!(
    task.id &&
    task.title &&
    task.task_date &&
    typeof task.completed === 'boolean'
  );
};

/**
 * Creates a default task object with current date
 * @param overrides - Optional fields to override defaults
 * @returns Task object without ID (for creation)
 */
export const createDefaultTask = (overrides: Partial<Task> = {}): Omit<Task, 'id'> => {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    title: '',
    task_date: today,
    task_time: '',
    completed: false,
    ...overrides
  };
};

/**
 * Checks if a task is scheduled for today
 * @param task - Task to check
 * @returns True if task is due today
 */
export const isTaskDueToday = (task: Task): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return task.task_date === today;
};

/**
 * Determines if a task is overdue
 * @param task - Task to check
 * @returns True if task is past due and incomplete
 */
export const isTaskOverdue = (task: Task): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return task.task_date < today && !task.completed;
};

/**
 * Formats task time for user-friendly display
 * @param task - Task with time to format
 * @returns Formatted time string or empty string
 */
export const formatTaskTime = (task: Task): string => {
  if (!task.task_time) return '';
  
  try {
    const time = new Date(`2000-01-01T${task.task_time}`);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return task.task_time;
  }
};

/**
 * Determines task priority level based on urgency
 * @param task - Task to evaluate
 * @returns Priority level string
 */
export const getTaskPriority = (task: Task): 'low' | 'medium' | 'high' | 'urgent' => {
  if (!task.urgency_level) return 'low';
  
  if (task.urgency_level >= 4) return 'urgent';
  if (task.urgency_level >= 3) return 'high';
  if (task.urgency_level >= 2) return 'medium';
  return 'low';
};

/**
 * Displays comprehensive migration guide for developers
 * Shows correct usage patterns for the new DataContext approach
 */
export const showMigrationGuide = () => {
  console.info(`
TASK API MIGRATION GUIDE

NEW PATTERN (DataContext + SQLite):
import { useDataContext } from '../context/DataContext';

const TaskComponent = () => {
  const { 
    createTask, 
    updateTask, 
    deleteTask, 
    toggleTask, 
    fetchDayData 
  } = useDataContext();
  
  // Create task
  const newTask = await createTask({
    title: 'New task',
    task_date: '2025-06-01',
    completed: false
  });
  
  // Update task
  const updatedTask = await updateTask(existingTask);
  
  // Delete task
  await deleteTask(taskId);
  
  // Toggle completion
  const toggledTask = await toggleTask(task);
  
  // Fetch tasks for a date
  const { tasks } = await fetchDayData('2025-06-01');
};

OLD PATTERN (Deprecated):
import { addTask, updateTask } from '../api/Task';
// These will throw errors now!
`);
};

// Type utilities for external use
export type TaskWithoutId = Omit<Task, 'id'>;
export type TaskUpdate = Partial<Task>;
export type TaskValidation = {
  isValid: boolean;
  errors: string[];
};