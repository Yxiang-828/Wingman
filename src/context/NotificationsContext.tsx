import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getCurrentDate } from "../utils/dateUtils";
import type { Task, CalendarEvent } from "../types/database";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  date: string;
  time: string;
  read: boolean;
  actionable: boolean;
  actionText?: string;
  sourceId: number;
  completed?: boolean; // Add completed flag for tasks
}

interface NotificationsContextType {
  notifications: Notification[];
  readMap: Record<string, boolean>;
  markAsRead: (id: string) => void;
  generateNotifications: (tasks: Task[], events: CalendarEvent[]) => void;
  updateTaskCompletionStatus: (taskId: number, completed: boolean) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(
  null
);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  // Load read status from localStorage
  useEffect(() => {
    try {
      const savedRead = localStorage.getItem("readNotifications");
      if (savedRead) {
        setReadMap(JSON.parse(savedRead));
      }
    } catch (err) {
      console.error("Error loading notification data", err);
    }
  }, []);

  // Save read status to localStorage
  useEffect(() => {
    localStorage.setItem("readNotifications", JSON.stringify(readMap));
  }, [readMap]);

  // Generate notifications from tasks and events - FIXED to use actual current date
  const generateNotifications = useCallback(
    (tasks: Task[], events: CalendarEvent[]) => {
      // Get the current date - FIXED: Use getCurrentDate() instead of fixed date string
      const today = getCurrentDate();
      const todayStr = today.toISOString().split("T")[0];

      // Get tasks from today that aren't completed
      const taskNotifications = tasks
        .filter((task) => {
          if (task.completed) return false; // Skip completed tasks
          if (task.task_date !== todayStr) return false; // Only show today's tasks
          return true;
        })
        .map((task) => ({
          id: `task-${task.id}`,
          title: "Task Due Today",
          message: task.text,
          type: "task",
          date: task.task_date,
          time: task.task_time || "",
          read: readMap[`task-${task.id}`] || false,
          actionable: true,
          actionText: "Mark Complete",
          sourceId: task.id,
          completed: task.completed,
        }));

      // Get events from today
      const eventNotifications = events
        .filter((event) => {
          if (event.event_date !== todayStr) return false; // Only show today's events
          return true;
        })
        .map((event) => ({
          id: `event-${event.id}`,
          title: event.title,
          message: `${event.type} event at ${event.event_time}`,
          type: "event",
          date: event.event_date,
          time: event.event_time || "",
          read: readMap[`event-${event.id}`] || false,
          actionable: true,
          actionText: "View Details",
          sourceId: event.id,
        }));

      // Combine and sort by time (earliest first)
      const combined = [...taskNotifications, ...eventNotifications];
      combined.sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });

      setNotifications(combined);
    },
    [readMap]
  );

  // Mark notification as read
  const markAsRead = (id: string) => {
    setReadMap((prev) => ({ ...prev, [id]: true }));
  };

  // Update task completion status in notifications
  const updateTaskCompletionStatus = (taskId: number, completed: boolean) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) => {
        if (notification.type === "task" && notification.sourceId === taskId) {
          return {
            ...notification,
            completed: completed,
          };
        }
        return notification;
      })
    );
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        readMap,
        markAsRead,
        generateNotifications,
        updateTaskCompletionStatus,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
};
