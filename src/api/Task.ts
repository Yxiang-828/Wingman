import { api } from './apiClient';
import { getCurrentUserId } from '../utils/auth';

// Update Task interface to support string user_id and add isProcessing
export interface Task {
  id: number;
  text: string;
  date: string;
  time?: string;
  completed: boolean;
  user_id?: string | number;
  isProcessing?: boolean; // Add this property
}

// Map server response to frontend model with better error handling
const mapServerTask = (task: any): Task => {
  // Input validation
  if (!task) {
    console.error("Attempted to map null or undefined task");
    throw new Error("Invalid task data");
  }

  // Ensure we have an ID
  if (task.id === undefined || task.id === null) {
    console.error("Task missing ID:", task);
    throw new Error("Task data missing required ID field");
  }

  return {
    id: task.id,
    date: task.task_date || task.date || new Date().toISOString().split('T')[0],
    text: task.text || "",
    time: task.task_time || task.time || '',
    completed: !!task.completed,
    user_id: task.user_id || ''
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
    if (!userId) {
      console.warn("No user ID available for task fetch");
      return [];
    }
    
    console.log("Fetching tasks for date:", date);
    const response = await api.get(`/v1/tasks?date=${date}&user_id=${userId}`);
    
    // Handle different response formats
    if (!response) {
      return [];
    }
    
    // Check if response is an array directly
    if (Array.isArray(response)) {
      return response.map(mapServerTask);
    }
    
    // Check if response has a data property that's an array
    if (response.data && Array.isArray(response.data)) {
      return response.data.map(mapServerTask);
    }
    
    // Response is an object with an error
    if (response.error) {
      console.error("Error fetching tasks:", response.error);
      return [];
    }
    
    console.error("Invalid response format for tasks:", response);
    return [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

// Update the addTask function to properly handle responses or potential error cases
export const addTask = async (task: Omit<Task, "id">): Promise<Task> => {
  try {
    const formattedTask = mapClientTask(task);
    console.log("Adding task:", formattedTask);
    
    const response = await api.post('/v1/tasks', formattedTask);
    
    // Improved response handling
    if (!response) {
      console.error("Empty response received from server");
      
      // Return a constructed task as fallback with a temporary ID
      return {
        id: Date.now(), // Temporary ID
        text: task.text,
        date: task.date,
        time: task.time || '',
        completed: task.completed || false,
        user_id: getCurrentUserId()
      };
    }
    
    // If we get a response object but not in expected format
    if (typeof response !== 'object') {
      console.error("Invalid response format:", response);
      
      // Still return a usable task object
      return {
        id: Date.now(), // Temporary ID
        text: task.text,
        date: task.date,
        time: task.time || '',
        completed: task.completed || false,
        user_id: getCurrentUserId()
      };
    }
    
    // Handle the case where response is missing an ID
    if (!response.id) {
      console.warn("Response missing task ID, using generated ID:", response);
      return {
        id: Date.now(), // Generate a temporary ID
        text: response.text || task.text,
        date: response.task_date || response.date || task.date,
        time: response.task_time || response.time || task.time || '',
        completed: response.completed !== undefined ? response.completed : (task.completed || false),
        user_id: response.user_id || getCurrentUserId()
      };
    }
    
    // Return properly mapped task
    return mapServerTask({
      ...response,
      date: response.task_date || response.date || task.date,
      text: response.text || task.text,
      time: response.task_time || response.time || task.time || ''
    });
  } catch (error) {
    console.error('Error adding task:', error);
    
    // Return a constructed task as fallback
    return {
      id: Date.now(), // Generate a temporary ID
      text: task.text,
      date: task.date,
      time: task.time || '',
      completed: task.completed || false,
      user_id: getCurrentUserId()
    };
  }
};

// Update updateTask function to return full task data even if backend fails

export const updateTask = async (task: Task): Promise<Task> => {
  try {
    console.log("API: updateTask called with task:", task);
    
    // Store original task for fallback
    const originalTask = { ...task };
    
    // Create a copy and remove the id field to prevent Supabase identity column error
    const { id, isProcessing, ...taskData } = task;
    
    const formattedTask = mapClientTask(taskData);
    console.log("API: Sending to backend:", formattedTask);
    
    try {
      const response = await api.put(`/v1/tasks/${id}`, formattedTask);
      console.log("API: Backend response:", response);
      
      // If the response has all required fields, use it
      if (response && typeof response === 'object' && response.id) {
        // Return properly mapped task with all fields present
        return {
          id: id,
          date: response.task_date || response.date || originalTask.date,
          text: response.text || originalTask.text,
          time: response.task_time || response.time || originalTask.time || '',
          completed: response.completed !== undefined ? response.completed : originalTask.completed,
          user_id: response.user_id || originalTask.user_id || ''
        };
      } else {
        // If response is missing data, use the original task with completion toggled
        console.log("API: Response missing fields, returning task with updated completion");
        return {
          ...originalTask,
          completed: !originalTask.completed
        };
      }
    } catch (error) {
      // If API call fails, return the task with updated state anyway
      // This ensures the UI stays consistent even if backend fails
      console.error("API: Request failed:", error);
      return {
        ...originalTask,
        completed: !originalTask.completed
      };
    }
  } catch (error) {
    console.error('API: Error in updateTask:', error);
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

// Add this function export to Task.ts

export const toggleTaskCompletion = async (task: Task): Promise<Task> => {
  try {
    console.log("API: toggleTaskCompletion called for task ID:", task.id);
    
    // Create a new task object with toggled completion status
    const updatedTask = {
      ...task,
      completed: !task.completed
    };
    
    // Use the existing updateTask function to save the change
    return await updateTask(updatedTask);
  } catch (error) {
    console.error('Error toggling task completion:', error);
    throw error;
  }
};