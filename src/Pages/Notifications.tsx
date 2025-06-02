import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import { useData } from "../context/DataContext";
import { getCurrentUserId } from "../utils/auth";
import { getTodayDateString } from "../utils/timeUtils";
import { useNavigationRefresh } from "../Hooks/useNavigationRefresh";
import DetailPopup from "../components/Common/DetailPopup";
import "./Notifications.css";

// ✅ HELPER FUNCTIONS - Move outside component to prevent re-creation
const shouldTaskFail = (task: Task): boolean => {
  if (task.completed || task.failed) return false;
  if (!task.task_time || !task.task_date) return false;

  const now = new Date();
  const taskDateTime = new Date(`${task.task_date}T${task.task_time}`);
  return taskDateTime < now;
};

const isEventOverdue = (event: CalendarEvent): boolean => {
  if (!event.event_time || !event.event_date) return false;

  const now = new Date();
  const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
  return eventDateTime < now;
};

const showFailedTaskNotification = (task: Task) => {
  if (Notification.permission === "granted") {
    new Notification("Mission Failed!", {
      body: `You have failed this mission: "${task.title}"`,
      icon: "/icon-failed.png",
    });
  }

  const failEvent = new CustomEvent("task-failed", {
    detail: { task, message: `You have failed this mission: "${task.title}"` },
  });
  window.dispatchEvent(failEvent);
};

const showEventReminder = (event: CalendarEvent) => {
  if (Notification.permission === "granted") {
    new Notification("Event Reminder", {
      body: `${event.title} is starting soon!`,
      icon: "/icon-event.png",
    });
  }
};

// ✅ COUNTDOWN TIMER COMPONENT - Separate to avoid hook order issues
interface CountdownTimerProps {
  targetTime: string;
  date: string;
  type: "task" | "event";
  isCompleted?: boolean;
  isFailed?: boolean;
  onTaskFail?: () => void;
  onEventReminder?: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  date,
  type,
  isCompleted = false,
  isFailed = false,
  onTaskFail,
  onEventReminder,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    shouldFail: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOverdue: false,
    shouldFail: false,
  });

  useEffect(() => {
    if (isCompleted || isFailed || !targetTime || targetTime === "All day") {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(`${date}T${targetTime}`);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          isOverdue: true,
          shouldFail: type === "task",
        });

        if (type === "task" && onTaskFail) {
          onTaskFail();
        } else if (type === "event" && onEventReminder) {
          onEventReminder();
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
          shouldFail: false,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, date, type, isCompleted, isFailed, onTaskFail, onEventReminder]);

  if (isCompleted || isFailed || !targetTime || targetTime === "All day") {
    return null;
  }

  const { hours, minutes, seconds, isOverdue, shouldFail } = timeLeft;

  const getUrgencyLevel = () => {
    if (shouldFail || isOverdue) return "critical";
    if (hours === 0 && minutes <= 30) return "warning";
    if (hours <= 2) return "upcoming";
    return "normal";
  };

  const urgencyLevel = getUrgencyLevel();

  return (
    <div className={`countdown-timer ${urgencyLevel}`}>
      {isOverdue ? (
        <div className="failed-indicator">
          <span className="failed-icon">⚠️</span>
          <span className="failed-text">Overdue</span>
        </div>
      ) : (
        <div className="time-display">
          <span className="time-value">{String(hours).padStart(2, '0')}</span>
          <span className="time-separator">:</span>
          <span className="time-value">{String(minutes).padStart(2, '0')}</span>
          <span className="time-separator">:</span>
          <span className="time-value">{String(seconds).padStart(2, '0')}</span>
        </div>
      )}
    </div>
  );
};

// ✅ EVENT NOTIFY BUTTON COMPONENT
interface EventNotifyButtonProps {
  event: CalendarEvent;
  onSetReminder: (event: CalendarEvent) => void;
  isActive: boolean;
}

const EventNotifyButton: React.FC<EventNotifyButtonProps> = ({
  event,
  onSetReminder,
  isActive,
}) => {
  return (
    <button
      className={`event-notify-btn ${isActive ? 'active' : ''}`}
      onClick={() => onSetReminder(event)}
      title={isActive ? "Reminder set" : "Set reminder"}
    >
      <span className="notify-icon">🔔</span>
      {isActive ? "Set" : "Notify"}
    </button>
  );
};

// ✅ MAIN NOTIFICATIONS COMPONENT
const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTask } = useData();

  // ✅ ALL STATE HOOKS FIRST - NEVER CONDITIONAL
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [failedTasks, setFailedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentPopupItem, setCurrentPopupItem] = useState<Task | CalendarEvent | null>(null);
  const [eventReminders, setEventReminders] = useState<Set<number>>(new Set());
  const [readItems, setReadItems] = useState<Set<string>>(new Set());

  // ✅ TAB MANAGEMENT - ALWAYS AFTER STATE
  const query = new URLSearchParams(location.search);
  const tabFromUrl = query.get("tab");
  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl === "task" || tabFromUrl === "event" || tabFromUrl === "failed"
      ? tabFromUrl
      : "all"
  );

  // ✅ ALL CALLBACKS AFTER STATE - NEVER CONDITIONAL
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
      console.log(`🔔 Notifications: Fetching data for ${today} (direct SQLite)`);

      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today),
        window.electronAPI.db.getEvents(userId, today),
      ]);

      const allTasks = tasks || [];
      const allEvents = events || [];

      // Process tasks for failure detection
      const pendingTasksToCheck = allTasks.filter((task: Task) => !task.completed && !task.failed);
      const currentFailedTasks = allTasks.filter((task: Task) => task.failed);
      const newlyFailedTasks: Task[] = [];

      // Check for newly failed tasks
      for (const task of pendingTasksToCheck) {
        if (shouldTaskFail(task)) {
          try {
            await window.electronAPI.db.updateTask(task.id, { failed: true });
            newlyFailedTasks.push({ ...task, failed: true });
            showFailedTaskNotification(task);
          } catch (error) {
            console.error("Error marking task as failed:", error);
          }
        }
      }

      // Filter events that aren't overdue
      const validEvents = allEvents.filter((event: CalendarEvent) => !isEventOverdue(event));

      // Update state
      setPendingTasks(allTasks.filter((task: Task) => !task.completed && !task.failed));
      setFailedTasks([...currentFailedTasks, ...newlyFailedTasks]);
      setTodaysEvents(validEvents);

      console.log(`🔔 Notifications: Loaded ${allTasks.length} tasks, ${validEvents.length} events`);
    } catch (error) {
      console.error("❌ Notifications: Error fetching data:", error);
      setPendingTasks([]);
      setFailedTasks([]);
      setTodaysEvents([]);
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  }, []);

  const handleTaskFailure = useCallback(
    async (task: Task) => {
      try {
        console.log(`💥 Task ${task.id} has failed`);
        await window.electronAPI.db.updateTask(task.id, { failed: true });
        showFailedTaskNotification(task);
        await fetchNotificationsData();
      } catch (error) {
        console.error("Error handling task failure:", error);
      }
    },
    [fetchNotificationsData]
  );

  const handleEventReminder = useCallback(
    (event: CalendarEvent) => {
      const reminders = new Set(eventReminders);

      if (reminders.has(event.id)) {
        reminders.delete(event.id);
        console.log(`🔕 Reminder removed for event: ${event.title}`);
      } else {
        reminders.add(event.id);
        console.log(`🔔 Reminder set for event: ${event.title}`);
        showEventReminder(event);
      }

      setEventReminders(reminders);
      localStorage.setItem("event-reminders", JSON.stringify([...reminders]));
    },
    [eventReminders]
  );

  const showPopupFor = useCallback((item: Task | CalendarEvent) => {
    console.log("🔍 Notifications: Setting popup item:", item);
    setCurrentPopupItem(item);
  }, []);

  const handleEntryClick = useCallback((item: Task | CalendarEvent) => {
    console.log("🔍 Notifications: Showing popup for:", item);
    showPopupFor(item);
  }, [showPopupFor]);

  // ✅ ALL useEffect HOOKS AFTER CALLBACKS - NEVER CONDITIONAL
  useEffect(() => {
    try {
      const stored = localStorage.getItem("event-reminders");
      if (stored) {
        const reminderIds = JSON.parse(stored);
        setEventReminders(new Set(reminderIds));
      }
    } catch (error) {
      console.error("Error loading reminders:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotificationsData();
  }, [fetchNotificationsData]);

  useEffect(() => {
    const interval = setInterval(fetchNotificationsData, 30000);
    return () => clearInterval(interval);
  }, [fetchNotificationsData]);

  // ✅ Navigation refresh hook
  useNavigationRefresh();

  // ✅ MEMOIZED VALUES AFTER EFFECTS
  const getFilteredItemsForDisplay = useMemo(() => {
    switch (activeTab) {
      case "task":
        return {
          tasks: pendingTasks,
          events: [],
          failed: [],
        };
      case "event":
        return {
          tasks: [],
          events: todaysEvents,
          failed: [],
        };
      case "failed":
        return {
          tasks: [],
          events: [],
          failed: failedTasks,
        };
      default: // "all"
        return {
          tasks: pendingTasks,
          events: todaysEvents,
          failed: failedTasks,
        };
    }
  }, [activeTab, pendingTasks, todaysEvents, failedTasks]);

  const filteredData = getFilteredItemsForDisplay;
  const filteredTasks = filteredData.tasks;
  const filteredEvents = filteredData.events;
  const filteredFailed = filteredData.failed;

  // Calculate counts
  const totalTasksCount = pendingTasks.length;
  const totalEventsCount = todaysEvents.length;
  const totalFailedCount = failedTasks.length;
  const totalAllCount = totalTasksCount + totalEventsCount + totalFailedCount;

  // ✅ EARLY RETURNS ONLY AFTER ALL HOOKS
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
      {/* Enhanced Header */}
      <div className="notifications-header">
        <h1 className="notifications-title">Mission Control</h1>
        <div className="notifications-summary">
          <span className="total-count">{totalAllCount} Total Items</span>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="notifications-tabs">
        <button
          className={`notifications-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <span>All</span>
          <span className="notifications-count">{totalAllCount}</span>
        </button>

        <button
          className={`notifications-tab ${activeTab === "task" ? "active" : ""}`}
          onClick={() => setActiveTab("task")}
        >
          <span>Tasks</span>
          <span className="notifications-count">{totalTasksCount}</span>
        </button>

        <button
          className={`notifications-tab ${activeTab === "event" ? "active" : ""}`}
          onClick={() => setActiveTab("event")}
        >
          <span>Events</span>
          <span className="notifications-count">{totalEventsCount}</span>
        </button>

        <button
          className={`notifications-tab ${activeTab === "failed" ? "active" : ""}`}
          onClick={() => setActiveTab("failed")}
        >
          <span>Failed</span>
          <span className={`notifications-count ${totalFailedCount > 0 ? "failed" : ""}`}>
            {totalFailedCount}
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className="notifications-content">
        {/* Tasks */}
        {filteredTasks.length > 0 && (
          <div className="notifications-section">
            <h3>Pending Tasks ({filteredTasks.length})</h3>
            <div className="notifications-list">
              {filteredTasks.map((task) => (
                <div
                  key={`task-${task.id}`}
                  className="notification-item task"
                  onClick={() => handleEntryClick(task)}
                >
                  <div className="notification-icon task">📝</div>
                  <div className="notification-content">
                    <div className="notification-title">{task.title}</div>
                    <div className="notification-meta">
                      {task.task_time && (
                        <span className="notification-time">{task.task_time}</span>
                      )}
                      <span className="notification-badge active">Active</span>
                    </div>
                  </div>
                  {task.task_time && (
                    <CountdownTimer
                      targetTime={task.task_time}
                      date={task.task_date}
                      type="task"
                      isCompleted={task.completed}
                      isFailed={task.failed}
                      onTaskFail={() => handleTaskFailure(task)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {filteredEvents.length > 0 && (
          <div className="notifications-section">
            <h3>Today's Events ({filteredEvents.length})</h3>
            <div className="notifications-list">
              {filteredEvents.map((event) => (
                <div
                  key={`event-${event.id}`}
                  className={`notification-item event ${event.type?.toLowerCase() || ''}`}
                  onClick={() => handleEntryClick(event)}
                >
                  <div className={`notification-icon event ${event.type?.toLowerCase() || ''}`}>
                    📅
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{event.title}</div>
                    <div className="notification-meta">
                      {event.event_time && (
                        <span className="notification-time">{event.event_time}</span>
                      )}
                      <span className={`notification-badge ${event.type?.toLowerCase() || ''}`}>
                        {event.type || 'Event'}
                      </span>
                    </div>
                  </div>
                  <div className="notification-actions">
                    <EventNotifyButton
                      event={event}
                      onSetReminder={handleEventReminder}
                      isActive={eventReminders.has(event.id)}
                    />
                    {event.event_time && (
                      <CountdownTimer
                        targetTime={event.event_time}
                        date={event.event_date}
                        type="event"
                        onEventReminder={() => handleEventReminder(event)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Tasks */}
        {filteredFailed.length > 0 && (
          <div className="notifications-section">
            <h3>Failed Missions ({filteredFailed.length})</h3>
            <div className="notifications-list">
              {filteredFailed.map((task) => (
                <div
                  key={`failed-${task.id}`}
                  className="notification-item failed"
                  onClick={() => handleEntryClick(task)}
                >
                  <div className="notification-icon failed">💥</div>
                  <div className="notification-content">
                    <div className="notification-title">{task.title}</div>
                    <div className="notification-meta">
                      <span className="failed-text">Mission Failed</span>
                      <span className="notification-badge failed">Failed</span>
                    </div>
                  </div>
                  <div className="failed-indicator">
                    <span className="failed-icon">⚠️</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalAllCount === 0 && (
          <div className="notifications-empty">
            <div className="empty-icon">🎉</div>
            <h3>All Caught Up!</h3>
            <p>No pending notifications. Great work!</p>
          </div>
        )}
      </div>

      {/* Detail Popup */}
      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={() => setCurrentPopupItem(null)}
          container={document.body}
        />
      )}
    </div>
  );
};

export default Notifications;