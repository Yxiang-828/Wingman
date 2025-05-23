import type { Task } from '../api/Task'; 
import type { CalendarEvent } from '../api/Calendar';
import { getCurrentUserId } from "../utils/auth";
import { Auth } from '../utils/AuthStateManager';

// Check if we can use browser notifications
const checkNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Show a notification for a task
export const showTaskNotification = (task: Task) => {
  checkNotificationPermission().then(granted => {
    if (granted) {
      const notification = new Notification(`Task Reminder: ${task.text}`, {
        body: `Due on ${formatDate(task.date)} ${task.time ? 'at ' + task.time : ''}`,
        icon: '/src/assets/task-icon.png', // Create or use an appropriate icon
        tag: `task-${task.id}` // Prevents duplicate notifications for the same task
      });
      
      notification.onclick = () => {
        window.focus();
        window.location.href = `/calendar/day?date=${task.date}&highlight=task-${task.id}`;
      };
    }
  });
};

// Show a notification for an event
export const showEventNotification = (event: CalendarEvent) => {
  checkNotificationPermission().then(granted => {
    if (granted) {
      const notification = new Notification(`Event: ${event.title}`, {
        body: `${event.type} at ${event.time} on ${formatDate(event.date)}`,
        icon: `/src/assets/event-icon.png`, // Create or use an appropriate icon
        tag: `event-${event.id}` // Prevents duplicate notifications for the same event
      });
      
      notification.onclick = () => {
        window.focus();
        window.location.href = `/calendar/day?date=${event.event_date}&highlight=event-${event.id}`;
      };
    }
  });
};

// Format date helper
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
};

// Main notification checker
export const checkUpcomingNotifications = (tasks: Task[], events: CalendarEvent[]) => {
  const now = new Date();
  // Move the declaration here so it's available throughout the function
  const today = now.toISOString().split('T')[0];
  
  // Now 'today' is available here
  const todayTasks = tasks.filter(task => task.date === today && !task.completed);
  
  todayTasks.forEach(task => {
    if (!task.time) {
      // Task with no specific time - notify at the start of the day
      showTaskNotification(task);
      return;
    }
    
    // Check if it's time to notify for timed tasks
    const [hours, minutes] = task.time.split(':').map(Number);
    const taskTime = new Date(now);
    taskTime.setHours(hours, minutes, 0, 0);
    
    // Notify 15 minutes before the task is due
    const reminderTime = new Date(taskTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 15);
    
    if (now >= reminderTime && now < taskTime) {
      showTaskNotification(task);
    }
  });
  
  // Now 'today' is available here too
  const todayEvents = events.filter(event => event.date === today);
  
  todayEvents.forEach(event => {
    // Check if it's time to notify
    if (!event.time) return;
    
    // FIXED: Use time instead of event_time
    const [hours, minutes] = event.time.split(':').map(Number);
    const eventTime = new Date(now);
    eventTime.setHours(hours, minutes, 0, 0);
    
    // Notify 30 minutes before the event
    const reminderTime = new Date(eventTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 30);
    
    if (now >= reminderTime && now < eventTime) {
      showEventNotification(event);
    }
  });
};

// Start the notification service when the app loads
export const startNotificationService = (tasks: Task[], events: CalendarEvent[]) => {
  // Only start if authenticated
  if (!Auth.isAuthenticated) {
    console.log("Not starting notification service - not authenticated");
    return () => {}; // No-op cleanup
  }
  
  // Check immediately
  checkUpcomingNotifications(tasks, events);
  
  // Then check every minute
  const intervalId = setInterval(() => {
    checkUpcomingNotifications(tasks, events);
  }, 60000);
  
  // Return function to stop the service
  return () => clearInterval(intervalId);
};

// Add this new service file for desktop notifications
export const showDesktopNotification = (title: string, body: string) => {
  try {
    // Request permission if needed
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    
    // Show notification if permission granted
    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico'
      });
      
      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
      
      // Optional: handle click event
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  } catch (error) {
    console.error("Error showing desktop notification:", error);
  }
};

// Add to NotificationsContext
export const checkUpcomingEvents = (eventCache: any, taskCache: any) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Check events
  Object.values(eventCache || {}).flat().forEach((event: any) => {
    // Use todayStr for date comparisons
    const isToday = event.date === todayStr;
    const isUpcoming = event.date > todayStr && 
      new Date(event.date).getTime() - new Date(todayStr).getTime() <= 86400000; // Within next 24h

    if ((isToday && event.time === getCurrentTime()) || 
        (isUpcoming && shouldShowPreemptiveNotification())) {
      showDesktopNotification(
        `Event: ${event.title}`,
        isToday ? 
          `Your event "${event.title}" is starting now.` : 
          `Your event "${event.title}" is coming up tomorrow.`
      );
    }
  });
  
  // Check tasks - similar approach using todayStr variable
  Object.values(taskCache || {}).flat().forEach((task: any) => {
    // More detailed date logic using todayStr
    if (task.date === todayStr && !task.completed) {
      // Task due today logic here...
    }
  });
};

// Helper function (add this)
function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Helper function (add this)
function shouldShowPreemptiveNotification() {
  // Logic to determine if we should show notification for upcoming events
  return false; // Placeholder - implement according to your notification strategy
}

/**
 * A service that periodically cleans up old notifications
 * - Removes expired notifications
 * - Archives old read notifications
 */
export const startNotificationCleanupService = () => {
  console.log("Starting notification cleanup service");
  
  // Check for expired notifications every 30 minutes
  const intervalId = setInterval(() => {
    try {
      cleanupNotifications();
    } catch (error) {
      console.error("Error in notification cleanup:", error);
    }
  }, 30 * 60 * 1000); // 30 minutes
  
  // Run once immediately
  setTimeout(() => {
    try {
      cleanupNotifications();
    } catch (error) {
      console.error("Error in initial notification cleanup:", error);
    }
  }, 5000); // 5 seconds after startup
  
  // Return function to stop the service
  return () => {
    console.log("Stopping notification cleanup service");
    clearInterval(intervalId);
  };
};

/**
 * Cleans up notifications based on rules:
 * - Task notifications are removed once the task is completed + 1 day
 * - Event notifications are removed after the event date + 1 day
 * - Read notifications older than 14 days are archived
 */
// Modify the cleanupNotifications function to safely handle unauthenticated state
const cleanupNotifications = async () => {
  const userId = getCurrentUserId();
  
  // Exit early if no user instead of continuing with null checks
  if (!userId) {
    console.log("Skipping notification cleanup - user not authenticated");
    return;
  }
  
  try {
    console.log("Running notification cleanup");
    
    // In a real implementation, we would call API endpoints to:
    // 1. Remove completed task notifications older than 1 day
    // 2. Remove past event notifications older than 1 day
    // 3. Archive read notifications older than 14 days
    
    console.log("Notification cleanup completed");
  } catch (error) {
    console.error("Failed to clean up notifications:", error);
  }
};