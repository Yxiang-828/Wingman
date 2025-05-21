import type { Task } from '../api/Task'; 
import type { CalendarEvent } from '../api/Calendar';

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
        body: `Due on ${formatDate(task.task_date ?? '')} ${task.task_time ? 'at ' + task.task_time : ''}`,
        icon: '/src/assets/task-icon.png', // Create or use an appropriate icon
        tag: `task-${task.id}` // Prevents duplicate notifications for the same task
      });
      
      notification.onclick = () => {
        window.focus();
        window.location.href = `/calendar/day?date=${task.task_date}&highlight=task-${task.id}`;
      };
    }
  });
};

// Show a notification for an event
export const showEventNotification = (event: CalendarEvent) => {
  checkNotificationPermission().then(granted => {
    if (granted) {
      const notification = new Notification(`Event: ${event.title}`, {
        body: `${event.type} at ${event.event_time ?? ''} on ${formatDate(event.event_date ?? '')}`,
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
  const today = now.toISOString().split('T')[0];
  
  // Check for tasks due today
  const todayTasks = tasks.filter(task => task.task_date === today && !task.completed);
  
  todayTasks.forEach(task => {
    if (!task.task_time) {
      // Task with no specific time - notify at the start of the day
      showTaskNotification(task);
      return;
    }
    
    // Check if it's time to notify for timed tasks
    const [hours, minutes] = task.task_time.split(':').map(Number);
    const taskTime = new Date(now);
    taskTime.setHours(hours, minutes, 0, 0);
    
    // Notify 15 minutes before the task is due
    const reminderTime = new Date(taskTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 15);
    
    if (now >= reminderTime && now < taskTime) {
      showTaskNotification(task);
    }
  });
  
  // Check for events happening today
  const todayEvents = events.filter(event => event.event_date === today);
  
  todayEvents.forEach(event => {
    // Check if it's time to notify
    const [hours, minutes] = event.event_time ? event.event_time.split(':').map(Number) : [0, 0];
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

// Start the notification checker when the app loads
export const startNotificationService = (tasks: Task[], events: CalendarEvent[]) => {
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
  const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  // Check events
  Object.values(eventCache || {}).flat().forEach((event: any) => {
    if (event.date === todayStr && event.time === currentTime) {
      showDesktopNotification(
        `Event: ${event.title}`,
        `Your event "${event.title}" is starting now.`
      );
    }
  });
  
  // Check tasks
  Object.values(taskCache || {}).flat().forEach((task: any) => {
    if (task.date === todayStr && task.time === currentTime && !task.completed) {
      showDesktopNotification(
        `Task Reminder: ${task.text}`,
        `It's time for your task: ${task.text}`
      );
    }
  });
};