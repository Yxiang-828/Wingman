export interface Task {
  id: number;
  date: string;      // Frontend field
  task_date?: string; // DB field
  text: string;
  time: string;      // Frontend field
  task_time?: string; // DB field
  completed: boolean;
}

export const fetchTasks = async (date: string): Promise<Task[]> => {
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      console.error('No user ID found for task fetch');
      return [];
    }
    
    console.log("Fetching tasks for date:", date);
    const response = await fetch(`/api/v1/tasks?date=${date}&user_id=${user.id}`);
    
    if (!response.ok) {
      console.error(`Error fetching tasks: ${response.status} ${response.statusText}`);
      return [];
    }
    
    // The backend should transform the data to include both date and task_date fields
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

export const addTask = async (task: Omit<Task, "id">): Promise<Task> => {
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      throw new Error('No user ID found for task creation');
    }
    
    console.log("Adding task:", task);
    
    // Ensure date is properly formatted and user_id is included
    const formattedTask = {
      ...task,
      user_id: user.id,
      date: typeof task.date === 'object' ? task.date.toISOString().split('T')[0] : task.date
    };
    
    const response = await fetch('/api/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedTask),
    });
    
    if (response.status === 404 && response.statusText.includes("User")) {
      // Special handling for user not found - suggest logging in again
      alert("Your user session is invalid. Please log out and log in again.");
      
      // Auto-redirect to login
      window.location.href = '/login';
      throw new Error('User session expired. Please log in again.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(`Failed to add task: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
};

export const updateTask = async (task: Task): Promise<Task> => {
  try {
    console.log("API: updateTask called with task:", task);
    
    // Create a copy and remove the id field to prevent Supabase identity column error
    const { id, ...taskData } = task;
    
    // Ensure proper field mapping for backend
    // Handle field name mapping between frontend and backend
    if (task.date) {
      taskData.task_date = task.date;  // Ensure backend field is set
      console.log("API: Mapped date to task_date:", task.date);
    }
    
    if (task.time) {
      taskData.task_time = task.time;  // Ensure backend field is set
      console.log("API: Mapped time to task_time:", task.time);
    }
    
    // Make sure we're including the user ID
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      taskData.user_id = user.id;
      console.log("API: Added user_id:", user.id);
    } else {
      console.warn("API: No user.id found in localStorage");
    }
    
    console.log("API: Sending to backend:", taskData);
    
    const response = await fetch(`/api/v1/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    console.log("API: Backend response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API: Server error response:", errorText);
      throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log("API: Backend response data:", result);
    
    // Handle the special case where we got a success message but not the full task
    if (result.message && !result.text) {
      console.log("API: Got success message but not full task, returning merged object");
      // Return the original task with updated completion status
      return { ...task, completed: !task.completed, ...result };
    }
    
    // Make sure the result has frontend field names
    if (result.task_date) {
      result.date = result.task_date;
      console.log("API: Added date field from task_date");
    }
    
    if (result.task_time) {
      result.time = result.task_time;
      console.log("API: Added time field from task_time");
    }
    
    console.log("API: Returning final result:", result);
    return result;
  } catch (error) {
    console.error('API: Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`/api/v1/tasks/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete task');
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};