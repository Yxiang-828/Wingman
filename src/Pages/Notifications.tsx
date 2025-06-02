import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNavigationRefresh } from "../Hooks/useNavigationRefresh";
import DetailPopup from "../components/Common/DetailPopup";
import { parseLocalDateString, getTodayDateString } from "../utils/timeUtils";
import { getCurrentUserId } from "../utils/auth";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import "./Notifications.css";

// ✅ LOCAL: formatTime function
const formatTime = (timeStr: string): string => {
  if (!timeStr) return "";

  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  return timeStr;
};

// ✅ COUNTDOWN TIMER: Keep existing component
interface CountdownTimerProps {
  targetTime: string;
  date: string;
  type: "task" | "event";
  isCompleted?: boolean;
  onComplete?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  date,
  type,
  isCompleted = false,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    isPast: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOverdue: false,
    isPast: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        const targetDate = parseLocalDateString(date);
        if (targetTime) {
          const [time, period] = targetTime.split(/\s+/);
          const [hours, minutes] = time.split(':').map(Number);
          
          let adjustedHours = hours;
          if (period && period.toLowerCase() === 'pm' && hours !== 12) {
            adjustedHours += 12;
          } else if (period && period.toLowerCase() === 'am' && hours === 12) {
            adjustedHours = 0;
          }
          
          targetDate.setHours(adjustedHours, minutes, 0, 0);
        }

        const now = new Date();
        const diff = targetDate.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft({
            hours: 0,
            minutes: 0,
            seconds: 0,
            isOverdue: true,
            isPast: true,
          });
          
          if (onComplete && !timeLeft.isPast) {
            onComplete();
          }
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setTimeLeft({
            hours,
            minutes,
            seconds,
            isOverdue: false,
            isPast: false,
          });
        }
      } catch (error) {
        console.error("Error calculating countdown:", error);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetTime, date, onComplete, timeLeft.isPast]);

  if (isCompleted || !targetTime || targetTime === "All day") {
    return null;
  }

  const { hours, minutes, seconds, isPast } = timeLeft;

  const getUrgencyLevel = () => {
    if (isPast) return "overdue";
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 15) return "critical";
    if (totalMinutes <= 60) return "warning";
    if (totalMinutes <= 120) return "upcoming";
    return "normal";
  };

  const urgencyLevel = getUrgencyLevel();
  const formatCountdownTime = (value: number) => value.toString().padStart(2, "0");

  return (
    <div className={`countdown-timer ${urgencyLevel} ${type}`}>
      <div className="countdown-content">
        {isPast ? (
          <div className="overdue-indicator">
            <span className="overdue-icon">⚠️</span>
            <span className="overdue-text">Overdue</span>
          </div>
        ) : (
          <div className="time-display">
            <div className="time-unit">
              <span className="time-value">{formatCountdownTime(hours)}</span>
              <span className="time-label">h</span>
            </div>
            <span className="time-separator">:</span>
            <div className="time-unit">
              <span className="time-value">{formatCountdownTime(minutes)}</span>
              <span className="time-label">m</span>
            </div>
            <span className="time-separator">:</span>
            <div className="time-unit">
              <span className="time-value">{formatCountdownTime(seconds)}</span>
              <span className="time-label">s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ OWN DATA: Notifications manages its own state
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // ✅ POPUP STATE: Manage our own popup
  const [currentPopupItem, setCurrentPopupItem] = useState<Task | CalendarEvent | null>(null);

  // Alert system state
  const [alertItems, setAlertItems] = useState<Set<string>>(new Set());
  const [activeAlerts, setActiveAlerts] = useState<
    Map<string, { task?: Task; event?: CalendarEvent }>
  >(new Map());

  // Read state management
  const [readItems, setReadItems] = useState<Set<string>>(new Set());

  const query = new URLSearchParams(location.search);
  const tabFromUrl = query.get("tab");

  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl === "task" || tabFromUrl === "event" ? tabFromUrl : "all"
  );

  // ✅ OWN FETCH: Notifications fetches its own data from SQLite
  const fetchNotificationsData = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      console.log("🔔 Notifications: No user ID, skipping fetch");
      setLoading(false);
      setIsReady(true);
      return;
    }

    setLoading(true);

    try {
      const today = getTodayDateString();
      console.log(`🔔 Notifications: Fetching data for ${today} (own data management)`);

      // ✅ DIRECT SQLite calls
      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today),
        window.electronAPI.db.getEvents(userId, today),
      ]);

      // Filter for notifications
      const pendingTasksFiltered = (tasks || []).filter((task: Task) => !task.completed);
      const todaysEventsFiltered = events || [];

      setPendingTasks(pendingTasksFiltered);
      setTodaysEvents(todaysEventsFiltered);

      console.log(`✅ Notifications: Loaded ${pendingTasksFiltered.length} pending tasks, ${todaysEventsFiltered.length} events`);
    } catch (error) {
      console.error("🔔 Notifications: Error fetching data:", error);
      setPendingTasks([]);
      setTodaysEvents([]);
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  }, []);

  // ✅ INITIAL LOAD: Fetch data on mount
  useEffect(() => {
    fetchNotificationsData();
  }, [fetchNotificationsData]);

  // ✅ AUTO REFRESH: Every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔔 Notifications: Auto-refresh triggered");
      fetchNotificationsData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchNotificationsData]);

  // ✅ LISTEN: For task/event updates from other components
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log("🔔 Notifications: External data update detected, refreshing");
      fetchNotificationsData();
    };

    // Listen for various refresh events
    window.addEventListener("dashboard-refresh", handleDataUpdate);
    window.addEventListener("notifications-refresh", handleDataUpdate);
    window.addEventListener("navigation-refresh", handleDataUpdate);
    window.addEventListener("task-updated", handleDataUpdate);
    window.addEventListener("event-updated", handleDataUpdate);

    return () => {
      window.removeEventListener("dashboard-refresh", handleDataUpdate);
      window.removeEventListener("notifications-refresh", handleDataUpdate);
      window.removeEventListener("navigation-refresh", handleDataUpdate);
      window.removeEventListener("task-updated", handleDataUpdate);
      window.removeEventListener("event-updated", handleDataUpdate);
    };
  }, [fetchNotificationsData]);

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

  // Load alert items from localStorage on mount
  useEffect(() => {
    try {
      const alerts = localStorage.getItem("alertItems");
      if (alerts) {
        const alertArray = JSON.parse(alerts);
        setAlertItems(new Set(alertArray));
      }
    } catch (error) {
      console.error("Error loading alert items:", error);
    }
  }, []);

  // ✅ OWN POPUP MANAGEMENT
  const showPopupFor = useCallback((item: Task | CalendarEvent) => {
    setCurrentPopupItem(item);
  }, []);

  const closePopup = useCallback(() => {
    setCurrentPopupItem(null);
  }, []);

  // ✅ OWN TASK COMPLETION
  const completeTask = useCallback(async (taskId: number): Promise<void> => {
    try {
      const task = pendingTasks.find(t => t.id === taskId);
      if (!task) return;

      // Update in database
      await window.electronAPI.db.updateTask(taskId, {
        completed: true,
      });

      // Refresh our data
      await fetchNotificationsData();
      
      // Close popup
      closePopup();

      console.log(`✅ Notifications: Task ${taskId} completed and data refreshed`);
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }, [pendingTasks, fetchNotificationsData, closePopup]);

  // Save read items to localStorage
  const saveReadItems = useCallback((items: Set<string>) => {
    try {
      localStorage.setItem('notification-read-items', JSON.stringify([...items]));
    } catch (error) {
      console.error('Error saving read items:', error);
    }
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

  // Alert Me functionality
  const handleSetAlert = (
    item: Task | CalendarEvent,
    type: "task" | "event"
  ) => {
    const itemId = `${type}-${item.id}`;

    setAlertItems((prev) => new Set([...prev, itemId]));

    const alerts = JSON.parse(localStorage.getItem("alertItems") || "[]");
    alerts.push(itemId);
    localStorage.setItem("alertItems", JSON.stringify(alerts));

    markAsRead(itemId);

    console.log(
      `🔔 Alert set for ${type}: ${item.title || (item as any).text}`
    );
  };

  const goToNotificationSource = (type: string, id: number) => {
    if (type === "task") {
      navigate(`/calendar/day?highlight=task-${id}`);
    } else {
      navigate(`/calendar/day?highlight=event-${id}`);
    }
  };

  const handleItemClick = (item: Task | CalendarEvent) => {
    const itemId = `${item.id}`;
    markAsRead(itemId);
    showPopupFor(item);
  };

  // Handle timer completion
  const handleTimerComplete = useCallback(
    (item: Task | CalendarEvent, type: "task" | "event") => {
      const itemId = `${type}-${item.id}`;

      if (alertItems.has(itemId)) {
        setActiveAlerts((prev) => new Map(prev.set(itemId, { [type]: item })));

        setAlertItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });

        const alerts = JSON.parse(localStorage.getItem("alertItems") || "[]");
        const filteredAlerts = alerts.filter((id: string) => id !== itemId);
        localStorage.setItem("alertItems", JSON.stringify(filteredAlerts));
      }
    },
    [alertItems]
  );

  // Close alert popup
  const closeAlert = (itemId: string) => {
    setActiveAlerts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  };

  // ✅ FILTER: Only for display - counts stay the same
  const getFilteredItemsForDisplay = () => {
    switch (activeTab) {
      case "task":
        return {
          tasks: pendingTasks,
          events: [],
        };
      case "event":
        return {
          tasks: [],
          events: todaysEvents,
        };
      default: // "all"
        return {
          tasks: pendingTasks,
          events: todaysEvents,
        };
    }
  };

  const { tasks: filteredTasks, events: filteredEvents } = getFilteredItemsForDisplay();

  // ✅ FIXED: Static counts - never change regardless of tab
  const totalTasksCount = pendingTasks.length;
  const totalEventsCount = todaysEvents.length;
  const totalAllCount = totalTasksCount + totalEventsCount;

  // Calculate unread count
  const unreadCount = [
    ...pendingTasks.filter(task => !readItems.has(`task-${task.id}`)),
    ...todaysEvents.filter(event => !readItems.has(`event-${event.id}`))
  ].length;

  // Add navigation refresh hook
  useNavigationRefresh();

  if (!isReady || loading) {
    return (
      <div className="notifications-container">
        <div className="notifications-loading">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h1 className="notifications-title">
          Notifications 
          {unreadCount > 0 && (
            <span className="notifications-count">{unreadCount}</span>
          )}
        </h1>
        <div className="notifications-actions">
          <button
            className="notifications-mark-all"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </button>
        </div>
      </div>

      <div className="notifications-tabs">
        <button
          className={`notifications-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All
          <span className="notifications-count">{totalAllCount}</span>
        </button>
        <button
          className={`notifications-tab ${activeTab === "task" ? "active" : ""}`}
          onClick={() => setActiveTab("task")}
        >
          Tasks
          <span className="notifications-count">{totalTasksCount}</span>
        </button>
        <button
          className={`notifications-tab ${activeTab === "event" ? "active" : ""}`}
          onClick={() => setActiveTab("event")}
        >
          Events
          <span className="notifications-count">{totalEventsCount}</span>
        </button>
      </div>

      <div className="notifications-list">
        {/* Display tasks */}
        {filteredTasks.map((task) => (
          <div
            key={`task-${task.id}`}
            className="notification-item task unread"
            onClick={() => handleItemClick(task)}
          >
            <div className="notification-icon task">📝</div>
            <div className="notification-content">
              <div className="notification-header">
                <h3 className="notification-title">{task.title}</h3>
                <div className="notification-time">
                  {task.task_time && formatTime(task.task_time)}
                </div>
              </div>
              
              {task.task_time && (
                <CountdownTimer
                  targetTime={task.task_time}
                  date={task.task_date}
                  type="task"
                  isCompleted={task.completed}
                  onComplete={() => handleTimerComplete(task, "task")}
                />
              )}
            </div>
            <div className="notification-actions">
              <button
                className="notification-alert-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAlert(task, "task");
                }}
              >
                🔔
              </button>
              <button
                className="notification-navigate"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNotificationSource("task", task.id);
                }}
              >
                →
              </button>
            </div>
          </div>
        ))}

        {/* Display events */}
        {filteredEvents.map((event) => (
          <div
            key={`event-${event.id}`}
            className="notification-item event unread"
            onClick={() => handleItemClick(event)}
          >
            <div className="notification-icon event">📅</div>
            <div className="notification-content">
              <div className="notification-header">
                <h3 className="notification-title">{event.title}</h3>
                <div className="notification-time">
                  {event.event_time && formatTime(event.event_time)}
                </div>
              </div>
              
              {event.event_time && (
                <CountdownTimer
                  targetTime={event.event_time}
                  date={event.event_date}
                  type="event"
                  onComplete={() => handleTimerComplete(event, "event")}
                />
              )}
              
              {event.description && (
                <p className="notification-message">{event.description}</p>
              )}
            </div>
            <div className="notification-actions">
              <button
                className="notification-alert-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAlert(event, "event");
                }}
              >
                🔔
              </button>
              <button
                className="notification-navigate"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNotificationSource("event", event.id);
                }}
              >
                →
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {totalAllCount === 0 && (
          <div className="notifications-empty">
            <div className="empty-icon">📭</div>
            <h3>No notifications</h3>
            <p>You're all caught up! No pending tasks or events for today.</p>
            <button
              className="empty-action-btn"
              onClick={() => navigate("/calendar/day")}
            >
              Add New Task or Event
            </button>
          </div>
        )}
      </div>

      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          onComplete={completeTask}
          container={document.body}
        />
      )}

      {/* Alert Popups */}
      {Array.from(activeAlerts.entries()).map(([itemId, alertData]) => {
        const item = alertData.task || alertData.event;
        const type = alertData.task ? "task" : "event";

        return (
          <div key={itemId} className="alert-popup-overlay">
            <div className="alert-popup">
              <div className="alert-header">
                <div className="alert-icon">{type === "task" ? "📝" : "📅"}</div>
                <h3>Time's Up!</h3>
                <button
                  className="alert-close"
                  onClick={() => closeAlert(itemId)}
                >
                  ×
                </button>
              </div>
              <div className="alert-content">
                <div className="alert-item-type">{type.toUpperCase()}</div>
                <div className="alert-title">{item?.title}</div>
                {item && 'description' in item && item.description && (
                  <div className="alert-description">{item.description}</div>
                )}
              </div>
              <div className="alert-actions">
                {type === "task" && (
                  <button
                    className="alert-action-btn complete"
                    onClick={() => {
                      if (item?.id) completeTask(item.id);
                      closeAlert(itemId);
                    }}
                  >
                    Complete Task
                  </button>
                )}
                <button
                  className="alert-action-btn view"
                  onClick={() => {
                    const date = type === "task" 
                      ? (item as Task)?.task_date 
                      : (item as CalendarEvent)?.event_date;
                    navigate(`/calendar/day?date=${date}&highlight=${type}-${item?.id}`);
                    closeAlert(itemId);
                  }}
                >
                  View in Calendar
                </button>
                <button
                  className="alert-action-btn dismiss"
                  onClick={() => closeAlert(itemId)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Notifications;
