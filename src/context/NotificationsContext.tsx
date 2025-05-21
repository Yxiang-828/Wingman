import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useData } from "./DataContext";
import { differenceInDays, format } from "date-fns";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import { showDesktopNotification } from "../services/NotificationService";

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

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  completeTask: (taskId: number) => Promise<Task | void>; // Allow both Task and void returns
  showPopupFor: (item: Task | CalendarEvent) => void;
  currentPopupItem: Task | CalendarEvent | null;
  closePopup: () => void;
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
  const { taskCache, eventCache, toggleTask, currentWeekId } = useData();

  // States
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentPopupItem, setCurrentPopupItem] = useState<
    Task | CalendarEvent | null
  >(null);
  const dashboardRef = useRef<HTMLElement | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

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
    localStorage.setItem("dismissedNotifications", JSON.stringify(dismissedIds));
  }, [dismissedIds]);

  // Generate notifications from taskCache and eventCache
  useEffect(() => {
    if (!currentWeekId || !taskCache[currentWeekId] || !eventCache[currentWeekId])
      return;

    try {
      // Get the current date for comparisons
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      // Convert tasks to notifications (exclude completed tasks and dismissed ones)
      const allTasks = Object.values(taskCache[currentWeekId]).flat();
      const taskNotifications = allTasks
        .filter((task) => {
          // Only include current/future tasks that haven't been dismissed
          const notDismissed = !dismissedIds.includes(`task-${task.id}`);
          const currentOrFuture = task.date >= todayStr;
          const notCompleted = !task.completed;

          return notDismissed && currentOrFuture && notCompleted;
        })
        .map((task) => ({
          id: `task-${task.id}`,
          sourceId: task.id,
          title: "Task Due",
          message: task.text,
          type: "task" as const,
          date: task.date,
          time: task.time || "",
          read: readMap[`task-${task.id}`] || false,
          actionable: true,
          completed: task.completed,
        }));

      // Convert current/future events to notifications
      const allEvents = Object.values(eventCache[currentWeekId]).flat();
      const eventNotifications = allEvents
        .filter((event) => {
          // Only include current/future events that haven't been dismissed
          const notDismissed = !dismissedIds.includes(`event-${event.id}`);
          const currentOrFuture = event.date >= todayStr;

          return notDismissed && currentOrFuture;
        })
        .map((event) => ({
          id: `event-${event.id}`,
          sourceId: event.id,
          title: event.title,
          message: `${event.type} event at ${event.time}`,
          type: "event" as const,
          date: event.date,
          time: event.time || "",
          read: readMap[`event-${event.id}`] || false,
          actionable: true,
        }));

      // Combine and sort notifications by date and time
      const combined = [...taskNotifications, ...eventNotifications].sort((a, b) => {
        // First sort by date
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        // Then by time if dates are equal
        return (a.time || "").localeCompare(b.time || "");
      });

      setNotifications(combined);
    } catch (error) {
      console.error("Error generating notifications:", error);
    }
  }, [taskCache, eventCache, dismissedIds, readMap, currentWeekId]);

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

  // Define the function for calculating days since a date
  const daysSince = useCallback((dateStr: string): number => {
    return differenceInDays(new Date(), new Date(dateStr));
  }, []);

  // Complete a task and update the notification
  const completeTask = useCallback(
    async (taskId: number) => {
      try {
        // Find task across all dates in taskCache
        let taskToComplete: Task | undefined;
        let foundTask = false;

        if (taskCache[currentWeekId]) {
          Object.values(taskCache[currentWeekId]).forEach((tasks) => {
            if (foundTask) return;

            const task = tasks.find((t) => t.id === taskId);
            if (task) {
              taskToComplete = task;
              foundTask = true;
            }
          });
        }

        if (taskToComplete) {
          // Toggle the task using DataContext
          const updatedTask = await toggleTask(taskToComplete);

          // Update notifications state to reflect the change
          setNotifications((prev) =>
            prev.map((notification) => {
              if (notification.type === "task" && notification.sourceId === taskId) {
                return {
                  ...notification,
                  completed: updatedTask.completed,
                  read: true, // Mark as read when completed
                };
              }
              return notification;
            })
          );

          return updatedTask;
        }

        return undefined;
      } catch (error) {
        console.error("Error completing task:", error);
        throw error;
      }
    },
    [taskCache, currentWeekId, toggleTask]
  );

  // When the component mounts, find the dashboard container
  useEffect(() => {
    dashboardRef.current =
      document.querySelector(".dashboard") ||
      document.querySelector(".dashboard-container") ||
      document.getElementById("dashboard");
  }, []);

  // Show popup for task or event
  const showPopupFor = useCallback((item: Task | CalendarEvent) => {
    setCurrentPopupItem(item);
  }, []);

  // Close popup
  const closePopup = useCallback(() => {
    setCurrentPopupItem(null);
  }, []);

  // Check for upcoming events and tasks to show notifications
  const checkUpcomingEvents = useCallback(
    (eventCache: any, taskCache: any) => {
      if (!currentWeekId) return;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const currentTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Check events for today
      if (eventCache[currentWeekId] && eventCache[currentWeekId][todayStr]) {
        eventCache[currentWeekId][todayStr].forEach((event: any) => {
          if (event.time === currentTime) {
            showDesktopNotification(
              `Event: ${event.title}`,
              `Your event "${event.title}" is starting now.`
            );
          }
        });
      }

      // Check tasks for today
      if (taskCache[currentWeekId] && taskCache[currentWeekId][todayStr]) {
        taskCache[currentWeekId][todayStr].forEach((task: any) => {
          if (task.time === currentTime && !task.completed) {
            showDesktopNotification(
              `Task Reminder: ${task.text}`,
              `It's time for your task: ${task.text}`
            );
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

  // Context value
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
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

// Custom hook to use the notifications context - exported separately
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}
