import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { api } from '../api/apiClient';
import { getCurrentUserId } from '../utils/auth';
import type { Task } from '../api/Task';
import type { CalendarEvent } from '../api/Calendar';

interface CrudOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE';
  entity: 'TASK' | 'EVENT';
  data: any;
  affectedDate?: string;
}

type CacheUpdateCallback = (operation: CrudOperation) => void;

interface DataContextType {
  // CRUD Operations (sends to FastAPI + broadcasts)
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task>;
  deleteTask: (taskId: number) => Promise<void>;
  toggleTask: (task: Task) => Promise<Task>;
  
  createEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  updateEvent: (event: CalendarEvent) => Promise<CalendarEvent>;
  deleteEvent: (eventId: number) => Promise<void>;
  
  // Data Fetching (for primary cache owners only)
  fetchDayData: (date: string, page?: number) => Promise<{ tasks: Task[]; events: CalendarEvent[]; hasMore: { tasks: boolean; events: boolean } }>;
  
  // Cache Update Broadcasting
  subscribeToCacheUpdates: (componentId: string, callback: CacheUpdateCallback) => void;
  unsubscribeFromCacheUpdates: (componentId: string) => void;
  
  // Loading state
  loading: boolean;
  error: string | null;
}

class CacheUpdateBroadcaster {
  private subscribers = new Map<string, CacheUpdateCallback>();

  subscribe(componentId: string, callback: CacheUpdateCallback): void {
    this.subscribers.set(componentId, callback);
    console.log(`📡 ${componentId} subscribed to cache updates`);
  }

  unsubscribe(componentId: string): void {
    this.subscribers.delete(componentId);
    console.log(`📡 ${componentId} unsubscribed from cache updates`);
  }

  broadcast(operation: CrudOperation): void {
    console.log(`📡 Broadcasting ${operation.type} for ${operation.entity}:`, operation.data);
    
    this.subscribers.forEach((callback, componentId) => {
      try {
        callback(operation);
      } catch (error) {
        console.error(`📡 Error in ${componentId} cache update:`, error);
      }
    });
  }
}

const broadcaster = new CacheUpdateBroadcaster();

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Task: Cache first → API → Broadcast
  const createTask = useCallback(async (task: Partial<Task>): Promise<Task> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user ID
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create optimistic task with temporary ID
      const optimisticTask: Task = {
        id: Date.now(),
        title: task.title || '',
        task_date: task.task_date || '',
        task_time: task.task_time || '',
        completed: task.completed || false,
        user_id: userId
      };

      // Broadcast optimistic update immediately
      broadcaster.broadcast({
        type: 'CREATE',
        entity: 'TASK',
        data: optimisticTask,
        affectedDate: optimisticTask.task_date
      });

      // Send to API with user_id
      const taskWithUserId = { ...task, user_id: userId };
      const createdTask = await api.post('/v1/tasks', taskWithUserId);
      
      // Update with real ID and broadcast correction
      const finalTask = { ...optimisticTask, id: createdTask.id };
      broadcaster.broadcast({
        type: 'UPDATE',
        entity: 'TASK',
        data: finalTask,
        affectedDate: finalTask.task_date
      });

      return finalTask;
    } catch (error) {
      setError('Failed to create task');
      // Broadcast rollback
      broadcaster.broadcast({
        type: 'DELETE',
        entity: 'TASK',
        data: { id: Date.now() },
        affectedDate: task.task_date
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update Task: Cache first → API → Broadcast
  const updateTask = useCallback(async (task: Task): Promise<Task> => {
    setLoading(true);
    setError(null);
    
    try {
      // Broadcast optimistic update immediately
      broadcaster.broadcast({
        type: 'UPDATE',
        entity: 'TASK',
        data: task,
        affectedDate: task.task_date
      });

      // Send to API - remove id from body, keep in URL
      const { id, ...taskData } = task;
      const updatedTask = await api.put(`/v1/tasks/${task.id}`, taskData);
      
      // Broadcast final result
      const finalTask = { ...task, ...updatedTask };
      broadcaster.broadcast({
        type: 'UPDATE',
        entity: 'TASK',
        data: finalTask,
        affectedDate: finalTask.task_date
      });

      return finalTask;
    } catch (error) {
      setError('Failed to update task');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete Task: Cache first → API → Broadcast
  const deleteTask = useCallback(async (taskId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Broadcast optimistic delete immediately
      broadcaster.broadcast({
        type: 'DELETE',
        entity: 'TASK',
        data: { id: taskId }
      });

      // Send to API
      await api.delete(`/v1/tasks/${taskId}`);
      
      console.log(`✅ Task ${taskId} successfully deleted from API`);
    } catch (error) {
      setError('Failed to delete task');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle Task: Special case of update
  const toggleTask = useCallback(async (task: Task): Promise<Task> => {
    const toggledTask = { ...task, completed: !task.completed };
    return updateTask(toggledTask);
  }, [updateTask]);

  // Create Event
  const createEvent = useCallback(async (event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user ID
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const optimisticEvent: CalendarEvent = {
        id: Date.now(),
        title: event.title || '',
        event_date: event.event_date || '',
        event_time: event.event_time || '',
        type: event.type || '',
        description: event.description || '',
        user_id: userId
      };

      broadcaster.broadcast({
        type: 'CREATE',
        entity: 'EVENT',
        data: optimisticEvent,
        affectedDate: optimisticEvent.event_date
      });

      // Send to API with user_id - use correct endpoint
      const eventWithUserId = { ...event, user_id: userId };
      const createdEvent = await api.post('/v1/calendar', eventWithUserId);
      
      const finalEvent = { ...optimisticEvent, id: createdEvent.id };
      
      broadcaster.broadcast({
        type: 'UPDATE',
        entity: 'EVENT',
        data: finalEvent,
        affectedDate: finalEvent.event_date
      });

      return finalEvent;
    } catch (error) {
      setError('Failed to create event');
      broadcaster.broadcast({
        type: 'DELETE',
        entity: 'EVENT',
        data: { id: Date.now() },
        affectedDate: event.event_date
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEvent = useCallback(async (event: CalendarEvent): Promise<CalendarEvent> => {
    setLoading(true);
    setError(null);
    
    try {
      broadcaster.broadcast({
        type: 'UPDATE',
        entity: 'EVENT',
        data: event,
        affectedDate: event.event_date
      });

      // Send to API - remove id from body, keep in URL
      const { id, ...eventData } = event;
      const updatedEvent = await api.put(`/v1/calendar/${event.id}`, eventData);
      
      const finalEvent = { ...event, ...updatedEvent };
      broadcaster.broadcast({
        type: 'UPDATE',
        entity: 'EVENT',
        data: finalEvent,
        affectedDate: finalEvent.event_date
      });

      return finalEvent;
    } catch (error) {
      setError('Failed to update event');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      broadcaster.broadcast({
        type: 'DELETE',
        entity: 'EVENT',
        data: { id: eventId }
      });

      await api.delete(`/v1/calendar/${eventId}`);
      
      console.log(`✅ Event ${eventId} successfully deleted from API`);
    } catch (error) {
      setError('Failed to delete event');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ VERIFY: fetchDayData implementation is correct
  const fetchDayData = useCallback(async (date: string, page: number = 1) => {
    try {
      // Get user ID - CRITICAL
      const userId = getCurrentUserId();
      if (!userId) {
        console.warn('fetchDayData: No user ID available');
        return {
          tasks: [],
          events: [],
          hasMore: { tasks: false, events: false }
        };
      }

      console.log(`🌐 DataContext: Fetching data for ${date} with user_id: ${userId}`);

      // ✅ FIXED: Make sure API calls include user_id and handle errors properly
      const [tasksResponse, eventsResponse] = await Promise.all([
        api.get(`/v1/tasks?date=${date}&user_id=${userId}&page=${page}&limit=7`).catch(err => {
          console.error('Tasks fetch failed:', err);
          return { data: [] }; // Return empty data structure instead of empty array
        }),
        api.get(`/v1/calendar?date=${date}&user_id=${userId}&page=${page}&limit=7`).catch(err => {
          console.error('Events fetch failed:', err);
          return { data: [] }; // Return empty data structure instead of empty array
        })
      ]);

      // ✅ FIXED: Handle different response formats safely
      const tasks = Array.isArray(tasksResponse) ? tasksResponse : (tasksResponse?.data || []);
      const events = Array.isArray(eventsResponse) ? eventsResponse : (eventsResponse?.data || []);

      console.log(`✅ DataContext: Fetched ${tasks.length} tasks, ${events.length} events for ${date}`);

      return {
        tasks: tasks || [],
        events: events || [],
        hasMore: { 
          tasks: tasks.length >= 7, 
          events: events.length >= 7 
        }
      };
    } catch (error) {
      console.error(`❌ DataContext: Error fetching data for ${date}:`, error);
      return {
        tasks: [],
        events: [],
        hasMore: { tasks: false, events: false }
      };
    }
  }, []);

  const value: DataContextType = {
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchDayData,
    subscribeToCacheUpdates: broadcaster.subscribe.bind(broadcaster),
    unsubscribeFromCacheUpdates: broadcaster.unsubscribe.bind(broadcaster),
    loading,
    error
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

export const useData = useDataContext; // Alias for compatibility