// Notification command center - keeps your lordship informed of pressing matters
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useData } from "./DataContext";
import { getCurrentUserId } from "../utils/auth";
import { getTodayDateString } from "../utils/timeUtils";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";

interface NotificationsContextType {
  // Data
  todaysEvents: CalendarEvent[];
  pendingTasks: Task[];
  loading: boolean;
  isReady: boolean;
  unreadCount: number;

  // Popup management
  currentPopupItem: Task | CalendarEvent | null;
  showPopupFor: (item: Task | CalendarEvent) => void;
  closePopup: () => void;

  // Actions
  markAsRead: (itemId: string) => void;
  markAllAsRead: () => void;
  completeTask: (taskId: number) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toggleTask } = useData();

  // Direct SQLite state management
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Popup state
  const [currentPopupItem, setCurrentPopupItem] = useState<Task | CalendarEvent | null>(null);

  // Read state management
  const [readItems, setReadItems] = useState<Set<string>>(new Set());

  // Direct SQLite data fetching for immediate notifications
  const fetchNotificationsData = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      console.log("Notifications: No user ID, skipping fetch");
      setLoading(false);
      setIsReady(true);
      return;
    }

    setLoading(true);

    try {
      const today = getTodayDateString();
      console.log(`Notifications: Fetching data for ${today} (direct SQLite)`);

      // Direct SQLite calls - no cache layer for real-time accuracy
      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today),
        window.electronAPI.db.getEvents(userId, today),
      ]);

      // Filter for notifications
      const pendingTasksFiltered = (tasks || []).filter((task: Task) => !task.completed);
      const todaysEventsFiltered = events || [];

      setPendingTasks(pendingTasksFiltered);
      setTodaysEvents(todaysEventsFiltered);

      console.log(`Notifications: Loaded ${pendingTasksFiltered.length} pending tasks, ${todaysEventsFiltered.length} events`);
    } catch (error) {
      console.error("Notifications: Error fetching data:", error);
      setPendingTasks([]);
      setTodaysEvents([]);
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  }, []);

  // Load read items from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('notification-read-items');
      if (stored) {
        setReadItems(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading read items:', error);
    }
  }, []);

  // Save read items to localStorage
  const saveReadItems = useCallback((items: Set<string>) => {
    try {
      localStorage.setItem('notification-read-items', JSON.stringify([...items]));
    } catch (error) {
      console.error('Error saving read items:', error);
    }
  }, []);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchNotificationsData();
  }, [fetchNotificationsData]);

  // Auto-refresh every 5 minutes to keep your lordship informed
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Notifications: Auto-refresh triggered");
      fetchNotificationsData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchNotificationsData]);

  // Popup management
  const showPopupFor = useCallback((item: Task | CalendarEvent) => {
    setCurrentPopupItem(item);
  }, []);

  const closePopup = useCallback(() => {
    setCurrentPopupItem(null);
  }, []);

  // Read state management
  const markAsRead = useCallback((itemId: string) => {
    setReadItems(prev => {
      const newSet = new Set(prev);
      newSet.add(itemId);
      saveReadItems(newSet);
      return newSet;
    });
  }, [saveReadItems]);

  const markAllAsRead = useCallback(() => {
    const allIds = [
      ...pendingTasks.map(task => `task-${task.id}`),
      ...todaysEvents.map(event => `event-${event.id}`)
    ];
    
    const newSet = new Set([...readItems, ...allIds]);
    setReadItems(newSet);
    saveReadItems(newSet);
  }, [pendingTasks, todaysEvents, readItems, saveReadItems]);

  // Task completion with immediate refresh
  const completeTask = useCallback(async (taskId: number): Promise<void> => {
    try {
      const task = pendingTasks.find(t => t.id === taskId);
      if (!task) return;

      await toggleTask(task);
      
      // Refresh data after completion
      await fetchNotificationsData();
      
      closePopup();
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }, [pendingTasks, toggleTask, fetchNotificationsData, closePopup]);

  // Calculate unread count
  const unreadCount = [
    ...pendingTasks.filter(task => !readItems.has(`task-${task.id}`)),
    ...todaysEvents.filter(event => !readItems.has(`event-${event.id}`))
  ].length;

  const value: NotificationsContextType = {
    // Data
    todaysEvents,
    pendingTasks,
    loading,
    isReady,
    unreadCount,

    // Popup management
    currentPopupItem,
    showPopupFor,
    closePopup,

    // Actions
    markAsRead,
    markAllAsRead,
    completeTask,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};