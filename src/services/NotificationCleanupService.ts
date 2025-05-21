import { getCurrentDate } from "../utils/dateUtils";
import type { Task, CalendarEvent } from '../types/database';

export const cleanupExpiredItems = () => {
  try {
    // Get current date and time - FIXED: Use actual current date
    const now = getCurrentDate();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Load existing dismissed notifications
    const existingDismissedStr = localStorage.getItem('dismissedNotifications') || '[]';
    const dismissedIds: string[] = JSON.parse(existingDismissedStr);
    
    // Load recent tasks and events from localStorage cache (if available)
    const tasksCache = localStorage.getItem('tasksCache') || '[]';
    const eventsCache = localStorage.getItem('eventsCache') || '[]';
    
    let tasks: Task[] = [];
    let events: CalendarEvent[] = [];
    
    try {
      tasks = JSON.parse(tasksCache);
      events = JSON.parse(eventsCache);
    } catch (e) {
      console.error('Error parsing cache:', e);
    }
    
    // Find past tasks (completed or due date passed)
    const pastTaskIds = tasks
      .filter(task => {
        // If the task is already in dismissed list, skip it
        if (dismissedIds.includes(`task-${task.id}`)) {
          return false;
        }
        
        // Completed tasks should be dismissed
        if (task.completed) {
          return true;
        }
        
        // Tasks from previous days
        if (task.task_date < todayStr) {
          return true;
        }
        
        // Tasks from today with time in the past
        if (task.task_date === todayStr && task.task_time) {
          const [hours, minutes] = task.task_time.split(':').map(Number);
          const taskTimeMinutes = hours * 60 + minutes;
          
          // If task was over 30 minutes ago, auto-dismiss
          return taskTimeMinutes < currentTimeMinutes - 30;
        }
        
        return false;
      })
      .map(task => `task-${task.id}`);
      
    // Find past events (date/time passed)
    const pastEventIds = events
      .filter(event => {
        // If the event is already in dismissed list, skip it
        if (dismissedIds.includes(`event-${event.id}`)) {
          return false;
        }
        
        // Events from previous days
        if (event.event_date < todayStr) {
          return true;
        }
        
        // Events from today with time in the past
        if (event.event_date === todayStr && event.event_time) {
          const [hours, minutes] = event.event_time.split(':').map(Number);
          const eventTimeMinutes = hours * 60 + minutes;
          
          // If event was over 30 minutes ago, auto-dismiss
          return eventTimeMinutes < currentTimeMinutes - 30;
        }
        
        return false;
      })
      .map(event => `event-${event.id}`);
    
    // Add all past items to dismissed list
    const newDismissedIds = [...dismissedIds, ...pastTaskIds, ...pastEventIds];
    
    // Save back to localStorage if there are any changes
    if (newDismissedIds.length > dismissedIds.length) {
      localStorage.setItem('dismissedNotifications', JSON.stringify(newDismissedIds));
      console.log(`Auto-dismissed ${newDismissedIds.length - dismissedIds.length} old items`);
    }
    
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
};

export const startNotificationCleanupService = () => {
  // Run cleanup immediately
  cleanupExpiredItems();
  
  // Then run every 5 minutes
  const intervalId = setInterval(cleanupExpiredItems, 5 * 60 * 1000);
  
  // Return function to stop the service
  return () => clearInterval(intervalId);
};