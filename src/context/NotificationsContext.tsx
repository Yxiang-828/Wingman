import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type { Task } from '../api/Task'; // Import as type
import type { CalendarEvent } from '../api/Calendar'; // Import as type
import DetailPopup from '../components/Common/DetailPopup'; // Add this import
import { useData } from './DataContext';
import { format } from 'date-fns'; // For date formatting

// Define the notification type structure
export interface Notification {
  id: string;
  sourceId: number;  // The original task or event ID
  title: string;
  message: string;
  type: 'task' | 'event';
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
  completeTask: (taskId: number) => Promise<void>;
  showPopupFor: (item: Task | CalendarEvent) => void;
  currentPopupItem: Task | CalendarEvent | null;
  closePopup: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Access tasks and events from DataContext
  const { tasks, events, toggleTask } = useData();
  
  // States
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentPopupItem, setCurrentPopupItem] = useState<Task | CalendarEvent | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Load read status and dismissed notifications from localStorage
  useEffect(() => {
    try {
      const savedRead = localStorage.getItem('readNotifications');
      if (savedRead) {
        setReadMap(JSON.parse(savedRead));
      }
      
      const savedDismissed = localStorage.getItem('dismissedNotifications');
      if (savedDismissed) {
        setDismissedIds(JSON.parse(savedDismissed));
      }
    } catch (err) {
      console.error('Error loading notification data', err);
    }
  }, []);
  
  // Save read status to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('readNotifications', JSON.stringify(readMap));
  }, [readMap]);
  
  // Save dismissed notifications to localStorage
  useEffect(() => {
    localStorage.setItem('dismissedNotifications', JSON.stringify(dismissedIds));
  }, [dismissedIds]);
  
  // Generate notifications from tasks and events
  useEffect(() => {
    // Skip if no tasks or events loaded yet
    if (!tasks.length && !events.length) return;
    
    // Convert tasks to notifications (exclude completed tasks and dismissed ones)
    const taskNotifications = tasks
      .filter(task => {
        // Skip if already dismissed
        if (dismissedIds.includes(`task-${task.id}`)) return false;
        // Skip if completed
        if (task.completed) return false;
        return true;
      })
      .map(task => ({
        id: `task-${task.id}`,
        sourceId: task.id,
        title: 'Task Due',
        message: task.text,
        type: 'task' as const,
        date: task.date,
        time: task.time || '',
        read: readMap[`task-${task.id}`] || false,
        actionable: true,
        completed: task.completed,
      }));
    
    // Convert current/future events to notifications (exclude dismissed ones)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const eventNotifications = events
      .filter(event => {
        // Skip if already dismissed
        if (dismissedIds.includes(`event-${event.id}`)) return false;
        // Only keep today's events or future events
        return event.date >= todayStr;
      })
      .map(event => ({
        id: `event-${event.id}`,
        sourceId: event.id,
        title: event.title,
        message: `${event.type} event at ${event.time}`,
        type: 'event' as const,
        date: event.date,
        time: event.time,
        read: readMap[`event-${event.id}`] || false,
        actionable: true
      }));
    
    // Combine and sort notifications by date (soonest first)
    const combined = [...taskNotifications, ...eventNotifications];
    combined.sort((a, b) => {
      // First compare by date
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, sort by time
      if (!a.time) return 1; // No time goes last
      if (!b.time) return -1; // No time goes last
      return a.time.localeCompare(b.time);
    });
    
    setNotifications(combined);
  }, [tasks, events, readMap, dismissedIds]);
  
  // Mark a notification as read
  const markAsRead = (id: string) => {
    setReadMap(prev => ({
      ...prev,
      [id]: true
    }));
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    const allIds = notifications.reduce((acc, notification) => {
      acc[notification.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    setReadMap(prev => ({
      ...prev,
      ...allIds
    }));
  };
  
  // Dismiss a notification
  const dismissNotification = (id: string) => {
    if (!dismissedIds.includes(id)) {
      setDismissedIds(prev => [...prev, id]);
    }
    
    // Also mark as read
    markAsRead(id);
  };
  
  // Complete a task and update the notification
  const completeTask = async (taskId: number) => {
    try {
      // Find the task in the tasks array
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;
      
      // Toggle it to completed
      await toggleTask(taskToUpdate);
      
      // Dismiss the notification
      dismissNotification(`task-${taskId}`);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };
  
  // When the component mounts, find the dashboard container
  useEffect(() => {
    dashboardRef.current = document.querySelector('.dashboard') || 
                           document.querySelector('.dashboard-container') || 
                           document.getElementById('dashboard');
  }, []);
  
  // Show popup for task or event
  const showPopupFor = (item: Task | CalendarEvent) => {
    setCurrentPopupItem(item);
    // Mark the notification as read
    const itemType = 'title' in item ? 'event' : 'task';
    markAsRead(`${itemType}-${item.id}`);
  };
  
  // Close popup
  const closePopup = () => {
    setCurrentPopupItem(null);
  };
  
  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        completeTask,
        showPopupFor,
        currentPopupItem,
        closePopup
      }}
    >
      {children}
      {currentPopupItem && (
        <DetailPopup 
          item={currentPopupItem} 
          onClose={closePopup}
          onComplete={completeTask}
          container={dashboardRef.current || undefined}
        />
      )}
    </NotificationsContext.Provider>
  );
};

// Custom hook to use the notifications context
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
