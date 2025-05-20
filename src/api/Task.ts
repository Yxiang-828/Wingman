export interface Task {
  id: number;
  date: string;
  text: string;
  time: string;
  completed: boolean;
}

export const fetchTasks = async (date: string): Promise<Task[]> => {
  try {
    console.log("Fetching tasks for date:", date);
    const response = await fetch(`/api/v1/tasks?date=${date}`);
    if (!response.ok) {
      console.error(`Error fetching tasks: ${response.status} ${response.statusText}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

export const addTask = async (task: Omit<Task, "id">): Promise<Task> => {
  try {
    console.log("Adding task:", task);
    
    // Ensure date is properly formatted
    const formattedTask = {
      ...task,
      date: typeof task.date === 'object' ? task.date.toISOString().split('T')[0] : task.date
    };
    
    const response = await fetch('/api/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedTask),
    });
    
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
    const response = await fetch(`/api/v1/tasks/${task.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update task');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating task:', error);
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