import { api } from './apiClient';
import { getCurrentUserId } from '../utils/auth';

export interface Task {
  id: number;
  date: string;      // Frontend field
  task_date?: string; // DB field
  text: string;
  time: string;      // Frontend field
  task_time?: string; // DB field
  completed: boolean;
  user_id?: string;
  isProcessing?: boolean; // Local state only
}

// Map server response to frontend model
const mapServerTask = (task: any): Task => {
  return {
    id: task.id,
    date: task.task_date || task.date,
    text: task.text,
    time: task.task_time || task.time || '',
    completed: !!task.completed,
    user_id: task.user_id
  };
};

// Map frontend model to server request
const mapClientTask = (task: Partial<Task>): any => {
  // Get current user ID from auth utils
  const userId = task.user_id || getCurrentUserId();
  
  return {
    ...(task.id ? { id: task.id } : {}),
    text: task.text,
    task_date: task.date,
    task_time: task.time || '',
    completed: task.completed || false,
    user_id: userId
  };
};

export const fetchTasks = async (date: string): Promise<Task[]> => {
  try {
    const userId = getCurrentUserId();
    
    console.log("Fetching tasks for date:", date);
    const data = await api.get(`/v1/tasks?date=${date}&user_id=${userId}`);
    
    if (!data || !Array.isArray(data)) {
      console.error("Invalid response format for tasks:", data);
      return [];
    }
    
    return data.map(mapServerTask);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

export const addTask = async (task: Omit<Task, "id">): Promise<Task> => {
  try {
    const formattedTask = mapClientTask(task);
    console.log("Adding task:", formattedTask);
    
    const { data: result } = await api.post('/v1/tasks', formattedTask);
    return mapServerTask(result);
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
};

export const updateTask = async (task: Task): Promise<Task> => {
  try {
    console.log("API: updateTask called with task:", task);
    
    // Create a copy and remove the id field to prevent Supabase identity column error
    const { id, isProcessing, ...taskData } = task;
    
    const formattedTask = mapClientTask(taskData);
    console.log("API: Sending to backend:", formattedTask);
    
    const { data: result } = await api.put(`/v1/tasks/${id}`, formattedTask);
    console.log("API: Backend response:", result);
    
    return mapServerTask({...result, id});
  } catch (error) {
    console.error('API: Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (id: number): Promise<void> => {
  try {
    await api.delete(`/v1/tasks/${id}`);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};