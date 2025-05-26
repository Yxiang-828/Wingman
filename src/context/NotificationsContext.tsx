import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useData } from "./DataContext";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import { format } from "date-fns";
import { Auth } from "../utils/AuthStateManager";

// Define the notification type structure
export interface Notification {
  id: string;
  sourceId: number;
  title: string;
  message: string;
  type: "task" | "event";
  date: string;
  time: string;
  read: boolean;
  actionable: boolean;
  completed?: boolean;
}

// Add pagination state to the context
interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  completeTask: (taskId: number) => Promise<void>;
  showPopupFor: (item: Task | CalendarEvent) => void;
  currentPopupItem: Task | CalendarEvent | null;
  closePopup: () => void;
  loadMoreNotifications: (type: "task" | "event") => void; // Updated signature
  hasMoreNotifications: boolean;
  isLoadingMore: boolean;
  hasMoreTasks: boolean; // Added property
  hasMoreEvents: boolean; // Added property
}

// Create the context
const NotificationsContext = createContext<NotificationsContextType | null>(
  null
);

// Provider component - separate from the hook export
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Access tasks and events from DataContext
  const {
    taskCache,
    eventCache,
    toggleTask,
    currentWeekId,
    fixedCurrentWeekCache, // Add this import
  } = useData();

  // States
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentPopupItem, setCurrentPopupItem] = useState<
    Task | CalendarEvent | null
  >(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Auth.isAuthenticated);

  // Pagination states - these are now properly used
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // IMPORTANT: Define the generateNotificationsFromCache function BEFORE any useEffects that use it
  const generateNotificationsFromCache = useCallback(() => {
    console.log("NotificationsContext: Generating notifications from cache");

    const newNotifications: Notification[] = [];

    // OPTIMIZATION: Check fixed cache first for current week data
    if (fixedCurrentWeekCache) {
      console.log("Using fixed cache for current week notifications");

      // Process tasks from fixed cache
      if (fixedCurrentWeekCache.tasks) {
        Object.keys(fixedCurrentWeekCache.tasks).forEach((dateStr) => {
          const tasks = fixedCurrentWeekCache.tasks[dateStr];
          console.log(
            `Found ${tasks.length} tasks for ${dateStr} in fixed cache`
          );

          // Create notifications from tasks
          tasks.forEach((task) => {
            // Skip if this notification was dismissed
            const notificationId = `task-${task.id}`;
            if (dismissedIds.includes(notificationId)) {
              return;
            }

            // Create the notification object
            const notification: Notification = {
              id: notificationId,
              sourceId: task.id,
              type: "task",
              title: task.text,
              message: task.completed
                ? "This task has been completed"
                : "Don't forget to complete this task",
              date: task.date,
              time: task.time || "",
              read: readMap[notificationId] || false,
              actionable: !task.completed,
              completed: task.completed,
            };

            newNotifications.push(notification);
          });
        });
      }

      // Process events from fixed cache
      Object.keys(fixedCurrentWeekCache.events).forEach((dateStr) => {
        const events = fixedCurrentWeekCache.events[dateStr];
        console.log(
          `Found ${events.length} events for ${dateStr} in fixed cache`
        );

        // Create notifications from events
        events.forEach((event) => {
          // Skip if this notification was dismissed
          const notificationId = `event-${event.id}`;
          if (dismissedIds.includes(notificationId)) {
            return;
          }

          // Create the notification object
          const notification: Notification = {
            id: notificationId,
            sourceId: event.id,
            type: "event",
            title: event.title,
            message: `${event.type} event: ${event.title}`,
            date: event.date,
            time: event.time || "",
            read: readMap[notificationId] || false,
            actionable: false,
          };

          newNotifications.push(notification);
        });
      });
    }

    // Then process regular cache for any additional weeks
    // (original code remains the same here)
    Object.keys(taskCache).forEach((weekId) => {
      // Skip processing current week from regular cache if we already got it from fixed cache
      if (fixedCurrentWeekCache && weekId === fixedCurrentWeekCache.weekId) {
        console.log(
          `Skipping regular cache for week ${weekId} - already processed from fixed cache`
        );
        return;
      }

      console.log(`Processing task week: ${weekId}`);

      // For each date in this week's data
      Object.keys(taskCache[weekId]).forEach((dateStr) => {
        const tasks = taskCache[weekId][dateStr];
        console.log(`Found ${tasks.length} tasks for ${dateStr}`);

        // Create notifications from tasks
        tasks.forEach((task) => {
          // Skip if this notification was dismissed
          const notificationId = `task-${task.id}`;
          if (dismissedIds.includes(notificationId)) {
            return;
          }

          // Create the notification object
          const notification: Notification = {
            id: notificationId,
            sourceId: task.id,
            type: "task",
            title: task.text,
            message: task.completed
              ? "This task has been completed"
              : "Don't forget to complete this task",
            date: task.date,
            time: task.time || "",
            read: readMap[notificationId] || false,
            actionable: !task.completed,
            completed: task.completed,
          };

          newNotifications.push(notification);
          console.log(`Created notification for task: ${task.text}`);
        });
      });
    });

    // Process event cache
    Object.keys(eventCache).forEach((weekId) => {
      // Skip processing current week from regular cache if we already got it from fixed cache
      if (fixedCurrentWeekCache && weekId === fixedCurrentWeekCache.weekId) {
        return;
      }

      console.log(`Processing event week: ${weekId}`);

      // For each date in this week's data
      Object.keys(eventCache[weekId]).forEach((dateStr) => {
        const events = eventCache[weekId][dateStr];
        console.log(`Found ${events.length} events for ${dateStr}`);

        // Create notifications from events
        events.forEach((event) => {
          // Skip if this notification was dismissed
          const notificationId = `event-${event.id}`;
          if (dismissedIds.includes(notificationId)) {
            return;
          }

          // Create the notification object
          const notification: Notification = {
            id: notificationId,
            sourceId: event.id,
            type: "event",
            title: event.title,
            message: `${event.type} event: ${event.title}`,
            date: event.date,
            time: event.time || "",
            read: readMap[notificationId] || false,
            actionable: false,
          };

          newNotifications.push(notification);
          console.log(`Created notification for event: ${event.title}`);
        });
      });
    });

    console.log(`Total notifications generated: ${newNotifications.length}`);
    return newNotifications;
  }, [taskCache, eventCache, dismissedIds, readMap, fixedCurrentWeekCache]);

  // NOW we can use it in useEffect hooks
  useEffect(() => {
    // Listen for auth changes
    const unsubscribe = Auth.addListener((isAuth) => {
      setIsAuthenticated(isAuth);
      setAuthenticated(isAuth); // Update your existing state too
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update your existing useEffect to check auth status
  useEffect(() => {
    if (!isAuthenticated) {
      console.log(
        "NotificationsContext: Not generating notifications - not authenticated"
      );
      return;
    }

    if (
      Object.keys(taskCache).length > 0 ||
      Object.keys(eventCache).length > 0
    ) {
      console.log(
        "NotificationsContext: Generating notifications from available cache data"
      );
      const generatedNotifications = generateNotificationsFromCache();
      setNotifications(generatedNotifications);
    }
  }, [
    isAuthenticated, // Add this dependency
    taskCache,
    eventCache,
    dismissedIds,
    readMap,
    generateNotificationsFromCache,
  ]);

  // Helper function to generate notifications from cache
  // Fix the generateNotificationsFromCache function to bypass unnecessary auth check
  const bypassAuthCheckForNotificationGeneration = useCallback(() => {
    console.log(
      "NotificationsContext: Bypassing auth check for notification generation"
    );
    // Forcefully set authenticated to true for notification generation
    setAuthenticated(true);

    // Directly call the notification generation function
    generateNotificationsFromCache();
  }, [generateNotificationsFromCache]);

  // Trigger notification generation on demand (for example, after login)
  useEffect(() => {
    // If the component is mounted and user state changes to authenticated
    if (authenticated) {
      console.log("NotificationsContext: Authenticated state changed to true");
      bypassAuthCheckForNotificationGeneration();
    }
  }, [authenticated, bypassAuthCheckForNotificationGeneration]);

  // Load read status and dismissed notifications from localStorage
  useEffect(() => {
    try {
      const savedReadMap = localStorage.getItem("readNotifications");
      if (savedReadMap) {
        setReadMap(JSON.parse(savedReadMap));
      }

      const savedDismissed = localStorage.getItem("dismissedNotifications");
      if (savedDismissed) {
        setDismissedIds(JSON.parse(savedDismissed));
      }
    } catch (err) {
      console.error("Error loading notification state:", err);
    }
  }, []);

  // Save read status to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("readNotifications", JSON.stringify(readMap));
  }, [readMap]);

  // Save dismissed notifications to localStorage
  useEffect(() => {
    localStorage.setItem(
      "dismissedNotifications",
      JSON.stringify(dismissedIds)
    );
  }, [dismissedIds]);

  // Check for upcoming events and tasks to show notifications
  const checkUpcomingEvents = useCallback(
    (eventCache: any, taskCache: any) => {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd"); // Defined in proper scope

      console.log(`Checking upcoming events for ${todayStr}`);

      // Check events for today
      if (eventCache[currentWeekId] && eventCache[currentWeekId][todayStr]) {
        eventCache[currentWeekId][todayStr].forEach((event: any) => {
          // Event notification logic...
          if (event.time) {
            // Time logic...
          }
        });
      }

      // Check tasks for today
      if (taskCache[currentWeekId] && taskCache[currentWeekId][todayStr]) {
        taskCache[currentWeekId][todayStr].forEach((task: any) => {
          // Task notification logic...
          if (!task.completed && task.time) {
            // Time logic...
          }
        });
      }
    },
    [currentWeekId]
  );

  // Check for notifications every minute
  useEffect(() => {
    // Check for notifications that should display on desktop every minute
    const checkInterval = setInterval(() => {
      checkUpcomingEvents(eventCache, taskCache);
    }, 60000); // Check every minute

    // Initial check
    checkUpcomingEvents(eventCache, taskCache);

    return () => clearInterval(checkInterval);
  }, [eventCache, taskCache, checkUpcomingEvents]);

  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setReadMap((prev) => ({
      ...prev,
      [id]: true,
    }));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    const allIds = notifications.reduce((acc, notification) => {
      acc[notification.id] = true;
      return acc;
    }, {} as Record<string, boolean>);

    setReadMap((prev) => ({
      ...prev,
      ...allIds,
    }));
  }, [notifications]);

  // Dismiss a notification
  const dismissNotification = useCallback(
    (id: string) => {
      if (!dismissedIds.includes(id)) {
        setDismissedIds((prev) => [...prev, id]);
      }

      // Also mark as read
      markAsRead(id);
    },
    [dismissedIds, markAsRead]
  );

  // Complete a task and update the notification
  const completeTask = async (taskId: number): Promise<void> => {
    try {
      // Find the task in any of the date groups
      let foundTask: Task | undefined;

      // Search through all tasks in cache
      Object.values(taskCache || {}).forEach((week) => {
        Object.values(week || {}).forEach((dayTasks) => {
          const task = dayTasks.find((t) => t.id === taskId);
          if (task) {
            foundTask = task;
          }
        });
      });

      if (foundTask) {
        // Toggle the task's completion status - fixed to use one parameter
        await toggleTask(foundTask);

        // Update the notification status
        const notificationId = `task-${taskId}`;
        markAsRead(notificationId);
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  // Show popup for a specific task or event
  const showPopupFor = (item: Task | CalendarEvent) => {
    setCurrentPopupItem(item);
  };

  // Close the current popup
  const closePopup = () => {
    setCurrentPopupItem(null);
  };

  // Implement the loadMoreNotifications function that was missing but referenced in the interface
  const loadMoreNotifications = useCallback(
    (type: "task" | "event") => {
      setIsLoadingMore(true);

      try {
        // This is a simplified implementation since we're loading all notifications at once
        // In a real pagination scenario, you would fetch more data from the server

        if (type === "task") {
          // If we had more tasks to load, we would do it here
          // For now, just set hasMoreTasks to false to indicate no more tasks
          setHasMoreTasks(false);
        } else if (type === "event") {
          // If we had more events to load, we would do it here
          // For now, just set hasMoreEvents to false to indicate no more events
          setHasMoreEvents(false);
        }

        // After loading more notifications, update hasMoreNotifications
        setHasMoreNotifications(hasMoreTasks || hasMoreEvents);
      } catch (error) {
        console.error(`Error loading more ${type} notifications:`, error);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [hasMoreTasks, hasMoreEvents]
  );

  // Provider value
  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    completeTask,
    showPopupFor,
    currentPopupItem,
    closePopup,
    loadMoreNotifications,
    hasMoreNotifications,
    isLoadingMore,
    hasMoreTasks,
    hasMoreEvents,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

// Custom hook to use the NotificationsContext
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
};
