import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar"; // Only import CalendarEvent as type
import { fetchTasks, updateTask, addTask, deleteTask } from "../api/Task";
import {
  fetchEvents,
  addEvent,
  updateEvent, // Import the actual function
  deleteEvent,
} from "../api/Calendar";

interface DataContextType {
  tasks: Task[];
  events: CalendarEvent[];
  loading: boolean;
  refreshData: () => Promise<void>;
  fetchTasksByDate: (date: string) => Promise<Task[]>;
  fetchEventsByDate: (date: string) => Promise<CalendarEvent[]>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  toggleTask: (task: Task) => Promise<Task>;
  addNewTask: (task: Omit<Task, "id">) => Promise<Task>;
  addNewEvent: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent>;
  deleteExistingTask: (id: number) => Promise<void>;
  deleteExistingEvent: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Enhanced caching mechanism
  const [taskCache, setTaskCache] = useState<Record<string, Task[]>>({});
  const [eventCache, setEventCache] = useState<Record<string, CalendarEvent[]>>({});

  // Fetch data for today on initial load
  const refreshData = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    try {
      // Fetch today's tasks and events in parallel
      const [tasksData, eventsData] = await Promise.all([
        fetchTasks(today),
        fetchEvents(today),
      ]);

      setTasks(tasksData);
      setEvents(eventsData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced fetch tasks function with caching
  const fetchTasksByDate = async (date: string): Promise<Task[]> => {
    try {
      // Use cache if available and not expired
      if (taskCache[date]) {
        console.log(`Using cached tasks for ${date}`);
        return taskCache[date];
      }
      
      console.log(`Fetching tasks for ${date} from API`);
      const tasksData = await fetchTasks(date);
      
      // Update cache
      setTaskCache(prev => ({
        ...prev,
        [date]: tasksData
      }));
      
      // Also update the global tasks array
      const existingTaskIds = tasks.map(t => t.id);
      const newTasks = tasksData.filter(t => !existingTaskIds.includes(t.id));
      if (newTasks.length > 0) {
        setTasks(prev => [...prev, ...newTasks]);
      }
      
      return tasksData;
    } catch (error) {
      console.error(`Error fetching tasks for ${date}:`, error);
      return [];
    }
  };

  // Enhanced fetch events function with caching
  const fetchEventsByDate = async (date: string): Promise<CalendarEvent[]> => {
    try {
      // Use cache if available and not expired
      if (eventCache[date]) {
        console.log(`Using cached events for ${date}`);
        return eventCache[date];
      }
      
      console.log(`Fetching events for ${date} from API`);
      const eventsData = await fetchEvents(date);
      
      // Update cache
      setEventCache(prev => ({
        ...prev,
        [date]: eventsData
      }));
      
      // Also update the global events array
      const existingEventIds = events.map(e => e.id);
      const newEvents = eventsData.filter(e => !existingEventIds.includes(e.id));
      if (newEvents.length > 0) {
        setEvents(prev => [...prev, ...newEvents]);
      }
      
      return eventsData;
    } catch (error) {
      console.error(`Error fetching events for ${date}:`, error);
      return [];
    }
  };

  // Toggle task completed status
  const toggleTask = async (task: Task): Promise<Task> => {
    try {
      const updatedTask = { ...task, completed: !task.completed };
      const result = await updateTask(updatedTask);

      // Update local state
      setTasks((prev) => prev.map((t) => (t.id === result.id ? result : t)));

      return result;
    } catch (error) {
      console.error("Error toggling task:", error);
      throw error;
    }
  };

  // Add a new task
  const addNewTask = async (task: Omit<Task, "id">): Promise<Task> => {
    try {
      const newTask = await addTask(task);
      setTasks((prev) => [...prev, newTask]);
      
      // Invalidate cache for this date
      if (task.date) {
        invalidateCache(task.date);
      }
      
      return newTask;
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  };

  // Add a new event
  const addNewEvent = async (
    event: Omit<CalendarEvent, "id">
  ): Promise<CalendarEvent> => {
    try {
      const newEvent = await addEvent(event);
      setEvents((prev) => [...prev, newEvent]);
      
      // Invalidate cache for this date
      if (event.date) {
        invalidateCache(event.date);
      }
      
      return newEvent;
    } catch (error) {
      console.error("Error adding event:", error);
      throw error;
    }
  };

  // Delete a task
  const deleteExistingTask = async (id: number): Promise<void> => {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  };

  // Delete an event
  const deleteExistingEvent = async (id: number): Promise<void> => {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  };

  // Function to invalidate cache for a specific date when data changes
  const invalidateCache = (date: string) => {
    setTaskCache(prev => {
      const newCache = {...prev};
      delete newCache[date];
      return newCache;
    });
    
    setEventCache(prev => {
      const newCache = {...prev};
      delete newCache[date];
      return newCache;
    });
  };

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  return (
    <DataContext.Provider
      value={{
        tasks,
        events,
        loading,
        refreshData,
        fetchTasksByDate,
        fetchEventsByDate,
        setTasks,
        setEvents,
        toggleTask,
        addNewTask,
        addNewEvent,
        deleteExistingTask,
        deleteExistingEvent,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === null) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
