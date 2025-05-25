import type { Task } from '../api/Task'; // Import as type
import type { CalendarEvent } from '../api/Calendar'; // Import as type

/**
 * Automatically cleans up the notification storage by removing:
 * 1. Completed tasks
 * 2. Past events
 */
export const cleanupExpiredItems = () => {
  try {
    // Get current date
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Load existing dismissed notifications
    const existingDismissedStr = localStorage.getItem('dismissedNotifications') || '[]';
    const dismissedIds: string[] = JSON.parse(existingDismissedStr);
    
    // Load cached tasks and events
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
    
    // Find completed tasks to auto-dismiss
    const completedTaskIds = tasks
      .filter(task => {
        if (dismissedIds.includes(`task-${task.id}`)) {
          return false; // Already dismissed
        }
        return task.completed; // Auto-dismiss completed tasks
      })
      .map(task => `task-${task.id}`);
    
    // Find past events to auto-dismiss
    const pastEventIds = events
      .filter(event => {
        if (dismissedIds.includes(`event-${event.id}`)) {
          return false; // Already dismissed
        }
        return event.event_date < todayStr; // Auto-dismiss past events
      })
      .map(event => `event-${event.id}`);
    
    // Combine all IDs to dismiss
    const newDismissedIds = [...dismissedIds, ...completedTaskIds, ...pastEventIds];
    
    // Only save if there are changes
    if (newDismissedIds.length > dismissedIds.length) {
      localStorage.setItem('dismissedNotifications', JSON.stringify(newDismissedIds));
      console.log(`Auto-dismissed ${newDismissedIds.length - dismissedIds.length} items`);
    }
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
};

// Start the cleanup service
export const startNotificationCleanupService = () => {
  // Run cleanup immediately
  cleanupExpiredItems();
  
  // Then run every 30 minutes
  const intervalId = setInterval(cleanupExpiredItems, 30 * 60 * 1000);
  
  // Return function to stop the service
  return () => clearInterval(intervalId);
};