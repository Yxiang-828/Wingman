// ✅ HYBRID ARCHITECTURE: Tasks now handled by SQLite via DataContext
// This file now only provides type definitions and utilities

// ✅ Task interface - matches both Supabase schema and SQLite schema
export interface Task {
  id: number;
  title: string;        // ✅ Based on schema - tasks.title is "text" type
  task_date: string;    // ✅ Based on schema - tasks.task_date is "date" type
  task_time?: string;   // ✅ Based on schema - tasks.task_time is "time" type
  completed: boolean;   // ✅ Based on schema - tasks.completed is "bool" type
  user_id?: string | number; // ✅ Based on schema - tasks.user_id is "uuid" type
  isProcessing?: boolean; // Frontend-only field for UI state
  
  // Optional fields from extended schema
  task_type?: string;
  due_date?: string;
  last_reset_date?: string;
  urgency_level?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// ✅ DEPRECATED NOTICE: All data operations moved to DataContext + SQLite
console.warn('📢 MIGRATION NOTICE: Task API operations moved to DataContext + SQLite');
console.info('📋 USE INSTEAD: useDataContext() for createTask, updateTask, deleteTask, toggleTask');

// ✅ LEGACY API FUNCTIONS - DEPRECATED
// These functions now throw errors to guide migration to DataContext

export const fetchTasks = async (date: string): Promise<Task[]> => {
  const errorMsg = `🚨 fetchTasks() is DEPRECATED. Use DataContext.fetchDayData() instead.
  
BEFORE: fetchTasks('${date}')
AFTER:  const { fetchDayData } = useDataContext();
        const { tasks } = await fetchDayData('${date}');`;
        
  console.error(errorMsg);
  throw new Error('fetchTasks() moved to DataContext.fetchDayData() - check console for migration guide');
};

export const addTask = async (task: Omit<Task, "id">): Promise<Task> => {
  const errorMsg = `🚨 addTask() is DEPRECATED. Use DataContext.createTask() instead.
  
BEFORE: addTask(taskData)
AFTER:  const { createTask } = useDataContext();
        const newTask = await createTask(taskData);`;
        
  console.error(errorMsg);
  throw new Error('addTask() moved to DataContext.createTask() - check console for migration guide');
};

export const updateTask = async (task: Task): Promise<Task> => {
  const errorMsg = `🚨 updateTask() is DEPRECATED. Use DataContext.updateTask() instead.
  
BEFORE: updateTask(taskData)
AFTER:  const { updateTask } = useDataContext();
        const updatedTask = await updateTask(taskData);`;
        
  console.error(errorMsg);
  throw new Error('updateTask() moved to DataContext.updateTask() - check console for migration guide');
};

export const deleteTask = async (id: number): Promise<void> => {
  const errorMsg = `🚨 deleteTask() is DEPRECATED. Use DataContext.deleteTask() instead.
  
BEFORE: deleteTask(${id})
AFTER:  const { deleteTask } = useDataContext();
        await deleteTask(${id});`;
        
  console.error(errorMsg);
  throw new Error('deleteTask() moved to DataContext.deleteTask() - check console for migration guide');
};

export const toggleTaskCompletion = async (task: Task): Promise<Task> => {
  const errorMsg = `🚨 toggleTaskCompletion() is DEPRECATED. Use DataContext.toggleTask() instead.
  
BEFORE: toggleTaskCompletion(task)
AFTER:  const { toggleTask } = useDataContext();
        const toggledTask = await toggleTask(task);`;
        
  console.error(errorMsg);
  throw new Error('toggleTaskCompletion() moved to DataContext.toggleTask() - check console for migration guide');
};

// ✅ UTILITY FUNCTIONS - Still useful for type checking and validation

/**
 * Validate a task object has required fields
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
 * Create a default task with current date
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
 * Check if a task is due today
 */
export const isTaskDueToday = (task: Task): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return task.task_date === today;
};

/**
 * Check if a task is overdue
 */
export const isTaskOverdue = (task: Task): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return task.task_date < today && !task.completed;
};

/**
 * Format task time for display
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
 * Get task priority based on urgency level
 */
export const getTaskPriority = (task: Task): 'low' | 'medium' | 'high' | 'urgent' => {
  if (!task.urgency_level) return 'low';
  
  if (task.urgency_level >= 4) return 'urgent';
  if (task.urgency_level >= 3) return 'high';
  if (task.urgency_level >= 2) return 'medium';
  return 'low';
};

// ✅ MIGRATION HELPER - Show current usage guide
export const showMigrationGuide = () => {
  console.info(`
🔄 TASK API MIGRATION GUIDE

✅ NEW PATTERN (DataContext + SQLite):
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

❌ OLD PATTERN (Deprecated):
import { addTask, updateTask } from '../api/Task';
// These will throw errors now!
`);
};

// ✅ Export type utilities for other files
export type TaskWithoutId = Omit<Task, 'id'>;
export type TaskUpdate = Partial<Task>;
export type TaskValidation = {
  isValid: boolean;
  errors: string[];
};