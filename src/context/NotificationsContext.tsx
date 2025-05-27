import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useData } from "./DataContext";
import { useCalendarCache } from "../Hooks/useCalendar";
import { getCurrentUserId } from "../utils/auth";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import { Auth } from "../utils/AuthStateManager";
import { getTodayDateString } from "../utils/dateUtils";

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

// ✅ UPDATED: Interface with today's data
interface NotificationsContextType {
  // Today's data (same as Dashboard pattern)
  todaysTasks: Task[];
  todaysEvents: CalendarEvent[];
  pendingTasks: Task[]; // Filtered to uncompleted only
  
  // Basic notification functions
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  completeTask: (taskId: number) => Promise<void>;
  showPopupFor: (item: Task | CalendarEvent) => void;
  currentPopupItem: Task | CalendarEvent | null;
  closePopup: () => void;
  
  // Loading states
  loading: boolean;
  isReady: boolean;
  
  // Legacy properties for backwards compatibility
  notifications: Notification[];
  unreadCount: number;
  hasMoreNotifications: boolean;
  isLoadingMore: boolean;
  loadMoreNotifications: (type: string) => void;
  hasMoreTasks: boolean;
  hasMoreEvents: boolean;
  
  // Refresh function
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(
  null
);

// ✅ FIXED: Advanced localStorage manager with day-based expiry
const dismissedNotificationsManager = {
  STORAGE_KEY: "dismissedNotifications",
  
  set(id: string) {
    const dismissed = this.getAll();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    dismissed[id] = today;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dismissed));
    console.log(`📋 Dismissed notification ${id} until ${today}`);
  },

  getAll(): Record<string, string> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  isValid(dismissedDate: string): boolean {
    const today = new Date().toISOString().split("T")[0];
    return dismissedDate === today; // Only valid for the same day
  },

  getValidDismissed(): string[] {
    const dismissed = this.getAll();
    const valid = Object.entries(dismissed)
      .filter(([_, date]) => this.isValid(date))
      .map(([id]) => id);
    
    // Clean up expired entries
    this.cleanup();
    return valid;
  },

  cleanup() {
    const dismissed = this.getAll();
    const today = new Date().toISOString().split("T")[0];
    const cleaned = Object.fromEntries(
      Object.entries(dismissed).filter(([_, date]) => date === today)
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleaned));
    
    const removedCount = Object.keys(dismissed).length - Object.keys(cleaned).length;
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired dismissed notifications`);
    }
  }
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // ✅ COPY Dashboard pattern: Use shared cache
  const { getDayData } = useCalendarCache('Notifications');
  const { toggleTask } = useData();

  // ✅ Today's data state (same as Dashboard)
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // ✅ Basic notification state for backwards compatibility
  const [notifications] = useState<Notification[]>([]);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentPopupItem, setCurrentPopupItem] = useState<
    Task | CalendarEvent | null
  >(null);

  // ✅ Legacy state for backwards compatibility
  const [hasMoreNotifications] = useState(false);
  const [isLoadingMore] = useState(false);
  const [hasMoreTasks] = useState(false);
  const [hasMoreEvents] = useState(false);

  // ✅ COPY Dashboard pattern: Load today's data
  useEffect(() => {
    const loadNotificationData = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("Notifications: User not authenticated, skipping data fetch");
        setIsReady(true);
        return;
      }

      try {
        // Get today's date
        const today = getTodayDateString();
        console.log(`📅 Notifications: Loading data for ${today}`);
        
        // Copy data from shared cache (DayView is primary owner)
        const todayData = await getDayData(today);
        
        setTodaysTasks(todayData.tasks);
        setTodaysEvents(todayData.events);

        console.log(`📅 Notifications: Loaded ${todayData.tasks.length} tasks, ${todayData.events.length} events`);
      } catch (error) {
        console.error("Notifications load error:", error);
        setTodaysTasks([]);
        setTodaysEvents([]);
      } finally {
        setIsReady(true);
      }
    };

    loadNotificationData();
  }, [getDayData]);

  // ✅ Filter to pending tasks only (same as Dashboard)
  const pendingTasks = todaysTasks.filter((task) => !task.completed);

  // ✅ Auth listener
  useEffect(() => {
    const unsubscribe = Auth.addListener((isAuth) => {
      if (!isAuth) {
        // Clear notification-specific data on logout
        setReadMap({});
        setDismissedIds([]);
        localStorage.removeItem('readNotifications');
        localStorage.removeItem('dismissedNotifications');
        console.log('🧹 Notification data cleared on logout');
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ FIXED: Load dismissed notifications using the manager
  useEffect(() => {
    try {
      // Load read status
      const savedReadMap = localStorage.getItem("readNotifications");
      if (savedReadMap) {
        setReadMap(JSON.parse(savedReadMap));
      }

      // Load valid dismissed notifications (auto-cleans expired ones)
      const validDismissed = dismissedNotificationsManager.getValidDismissed();
      setDismissedIds(validDismissed);
      
      console.log(`📋 Loaded ${validDismissed.length} dismissed notifications for today`);
    } catch (err) {
      console.error("Error loading notification state:", err);
    }
  }, []);

  // ✅ Save read status to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("readNotifications", JSON.stringify(readMap));
  }, [readMap]);

  // ✅ Set loading state based on data readiness
  useEffect(() => {
    if (isReady) {
      setLoading(false);
    }
  }, [isReady]);

  // Calculate unread count from legacy notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ✅ Basic notification management functions
  const markAsRead = useCallback((id: string) => {
    setReadMap((prev) => ({
      ...prev,
      [id]: true,
    }));
  }, []);

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

  // ✅ FIXED: Use advanced manager for dismissing
  const dismissNotification = useCallback(
    (id: string) => {
      // Add to dismissed list using manager
      dismissedNotificationsManager.set(id);
      
      // Update local state
      if (!dismissedIds.includes(id)) {
        setDismissedIds((prev) => [...prev, id]);
      }
      
      // Also mark as read
      markAsRead(id);
    },
    [dismissedIds, markAsRead]
  );

  // ✅ Complete task function
  const completeTask = async (taskId: number): Promise<void> => {
    try {
      // Find the task in today's tasks
      const task = todaysTasks.find((t) => t.id === taskId);
      if (!task) {
        console.error(`Task with ID ${taskId} not found`);
        return;
      }

      // Toggle the task
      const updatedTask = await toggleTask(task);
      
      // Update local state
      setTodaysTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );

      // Mark notification as read
      const notificationId = `task-${taskId}`;
      markAsRead(notificationId);
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  // ✅ Popup management
  const showPopupFor = (item: Task | CalendarEvent) => {
    setCurrentPopupItem(item);
  };

  const closePopup = () => {
    setCurrentPopupItem(null);
  };

  // ✅ Legacy function for backwards compatibility
  const loadMoreNotifications = (type: string) => {
    console.log(`Loading more ${type} notifications...`);
  };

  // Add manual refresh function
  const refreshNotifications = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📋 Manually refreshing notifications data for ${today}`);
    
    try {
      // Get today's data
      const todayData = await getDayData(today, true); // Force refresh
    
      setTodaysTasks(todayData.tasks);
      setTodaysEvents(todayData.events);
      setIsReady(true);
    
      console.log(`📋 Refreshed notifications with ${todayData.tasks.length} tasks and ${todayData.events.length} events`);
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    }
  }, [getDayData]);

  // ✅ Provider value with today's data
  const value = {
    // Today's data (main functionality)
    todaysTasks,
    todaysEvents,
    pendingTasks,
    
    // Basic functions
    markAsRead,
    markAllAsRead,
    dismissNotification,
    completeTask,
    showPopupFor,
    currentPopupItem,
    closePopup,
    
    // Loading states
    loading,
    isReady,
    
    // Legacy compatibility
    notifications,
    unreadCount,
    hasMoreNotifications,
    isLoadingMore,
    loadMoreNotifications,
    hasMoreTasks,
    hasMoreEvents,

    // Refresh function
    refreshNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

// ✅ Custom hook
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
};
