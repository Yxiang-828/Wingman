import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useNotifications } from "../context/NotificationsContext";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import DetailPopup from "../components/Common/DetailPopup";
import "./Notifications.css";

// ✅ NEW: Countdown Timer Component (keeping existing)
interface CountdownTimerProps {
  targetTime: string;
  date: string;
  type: "task" | "event";
  isCompleted?: boolean;
  onComplete?: () => void; // ✅ NEW: Callback when timer hits 0
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  targetTime, 
  date, 
  type, 
  isCompleted = false,
  onComplete // ✅ NEW: Callback prop
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

  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      try {
        if (!targetTime || targetTime === "All day") {
          setTimeLeft({
            hours: 0,
            minutes: 0,
            seconds: 0,
            isOverdue: false,
            isPast: false,
          });
          return;
        }

        const [hours, minutes, seconds = "00"] = targetTime.split(":");
        const targetDate = new Date(date);
        targetDate.setHours(
          parseInt(hours, 10),
          parseInt(minutes, 10),
          parseInt(seconds, 10),
          0
        );

        const now = new Date();
        const diff = targetDate.getTime() - now.getTime();

        if (diff <= 0) {
          // ✅ NEW: Trigger callback when timer hits 0 (only once)
          if (!timeLeft.isPast && onComplete && Math.abs(diff) < 2000) { // Within 2 seconds of hitting 0
            console.log(`⏰ Timer completed for ${type}:`, targetTime);
            onComplete();
          }

          const absDiff = Math.abs(diff);
          const hoursOverdue = Math.floor(absDiff / (1000 * 60 * 60));
          const minutesOverdue = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
          const secondsOverdue = Math.floor((absDiff % (1000 * 60)) / 1000);

          setTimeLeft({
            hours: hoursOverdue,
            minutes: minutesOverdue,
            seconds: secondsOverdue,
            isOverdue: true,
            isPast: true,
          });
        } else {
          const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
          const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

          setTimeLeft({
            hours: hoursLeft,
            minutes: minutesLeft,
            seconds: secondsLeft,
            isOverdue: false,
            isPast: false,
          });

          if (diff < 30 * 60 * 1000 && diff > 0) {
            setPulseKey(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error("Error calculating countdown:", error);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetTime, date, onComplete, timeLeft.isPast]); // ✅ Add dependencies

  if (isCompleted || !targetTime || targetTime === "All day") {
    return null;
  }

  const { hours, minutes, seconds, isOverdue, isPast } = timeLeft;

  const getUrgencyLevel = () => {
    if (isPast) return "overdue";
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 15) return "critical";
    if (totalMinutes <= 60) return "warning";
    if (totalMinutes <= 120) return "upcoming";
    return "normal";
  };

  const urgencyLevel = getUrgencyLevel();
  const formatTime = (value: number) => value.toString().padStart(2, "0");

  return (
    <div className={`countdown-timer ${urgencyLevel} ${type}`} key={pulseKey}>
      <div className="countdown-content">
        {isPast ? (
          <div className="overdue-indicator">
            <span className="overdue-icon">⚠️</span>
            <span className="overdue-text">
              {hours > 0 && `${hours}h `}
              {minutes > 0 && `${minutes}m `}
              overdue
            </span>
          </div>
        ) : (
          <div className="time-display">
            {hours > 0 && (
              <>
                <span className="time-unit">
                  <span className="time-value">{formatTime(hours)}</span>
                  <span className="time-label">h</span>
                </span>
                <span className="time-separator">:</span>
              </>
            )}
            <span className="time-unit">
              <span className="time-value">{formatTime(minutes)}</span>
              <span className="time-label">m</span>
            </span>
            {hours === 0 && minutes < 30 && (
              <>
                <span className="time-separator">:</span>
                <span className="time-unit">
                  <span className="time-value">{formatTime(seconds)}</span>
                  <span className="time-label">s</span>
                </span>
              </>
            )}
          </div>
        )}
        
        {/* Progress ring for visual countdown */}
        {!isPast && hours < 24 && (
          <div className="countdown-ring">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.3"
              />
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="50.27"
                strokeDashoffset={50.27 * (1 - Math.min((hours * 60 + minutes) / (24 * 60), 1))}
                transform="rotate(-90 10 10)"
                className="countdown-progress"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    todaysTasks,
    todaysEvents,
    pendingTasks,
    loading,
    isReady,
    markAsRead,
    markAllAsRead,
    completeTask,
    showPopupFor,
    currentPopupItem,
    closePopup,
    unreadCount,
    dismissNotification, // ✅ Get from context
  } = useNotifications();

  // ✅ NEW: Alert system state
  const [alertItems, setAlertItems] = useState<Set<string>>(new Set());
  const [activeAlerts, setActiveAlerts] = useState<Map<string, { task?: Task; event?: CalendarEvent }>>(new Map());

  const query = new URLSearchParams(location.search);
  const tabFromUrl = query.get("tab");

  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl === "task" || tabFromUrl === "event" ? tabFromUrl : "all"
  );

  // ✅ NEW: Load alert items from localStorage on mount
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

  // ✅ NEW: Alert Me functionality
  const handleSetAlert = (item: Task | CalendarEvent, type: "task" | "event") => {
    const itemId = `${type}-${item.id}`;
    
    // Add to alert list
    setAlertItems(prev => new Set([...prev, itemId]));
    
    // Save to localStorage
    const alerts = JSON.parse(localStorage.getItem("alertItems") || "[]");
    alerts.push(itemId);
    localStorage.setItem("alertItems", JSON.stringify(alerts));
    
    // Mark as read
    markAsRead(itemId);
    
    console.log(`🔔 Alert set for ${type}: ${item.title || (item as any).text}`);
  };

  const goToNotificationSource = (type: string, id: number) => {
    if (type === "task") {
      navigate(`/calendar/day?highlight=task-${id}`);
    } else {
      navigate(`/calendar/day?highlight=event-${id}`);
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  };

  const handleItemClick = (item: Task | CalendarEvent) => {
    const itemId = `${item.id}`;
    markAsRead(itemId);
    showPopupFor(item);
  };

  // ✅ NEW: Handle timer completion
  const handleTimerComplete = useCallback((item: Task | CalendarEvent, type: "task" | "event") => {
    const itemId = `${type}-${item.id}`;
    
    // Only show alert if this item is in alert list
    if (alertItems.has(itemId)) {
      setActiveAlerts(prev => new Map(prev.set(itemId, { [type]: item })));
      
      // Remove from alert list since it's now triggered
      setAlertItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      
      // Update localStorage
      const alerts = JSON.parse(localStorage.getItem("alertItems") || "[]");
      const filteredAlerts = alerts.filter((id: string) => id !== itemId);
      localStorage.setItem("alertItems", JSON.stringify(filteredAlerts));
    }
  }, [alertItems]);

  // ✅ NEW: Close alert popup
  const closeAlert = (itemId: string) => {
    setActiveAlerts(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });
  };

  // ✅ UPDATED: Filter items to exclude those with alerts set (optional - or keep them visible)
  const getFilteredItems = () => {
    // Show all items regardless of alert status
    switch (activeTab) {
      case "task":
        return {
          tasks: pendingTasks,
          events: []
        };
      case "event":
        return {
          tasks: [],
          events: todaysEvents
        };
      default: // "all"
        return {
          tasks: pendingTasks,
          events: todaysEvents
        };
    }
  };

  const { tasks: filteredTasks, events: filteredEvents } = getFilteredItems();
  const totalItems = filteredTasks.length + filteredEvents.length;

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
        <h1 className="notifications-title">Notifications</h1>
        <div className="notifications-actions">
          <button
            className="notifications-mark-all"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <span className="icon">✓</span>
            Mark All as Read
          </button>
        </div>
      </div>

      <div className="notifications-tabs">
        <button
          className={`notifications-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All
          <span className="notifications-count">{totalItems}</span>
        </button>
        <button
          className={`notifications-tab ${
            activeTab === "task" ? "active" : ""
          }`}
          onClick={() => setActiveTab("task")}
        >
          Tasks
          <span className="notifications-count">{filteredTasks.length}</span>
        </button>
        <button
          className={`notifications-tab ${
            activeTab === "event" ? "active" : ""
          }`}
          onClick={() => setActiveTab("event")}
        >
          Events
          <span className="notifications-count">{filteredEvents.length}</span>
        </button>
      </div>

      <div className="notifications-list">
        {totalItems > 0 ? (
          <div className="notifications-items">
            <div className="notification-date-group">
              <div className="notification-date-header">
                <h3>{formatDateHeader(new Date().toISOString().split("T")[0])}</h3>
              </div>

              {/* Render Tasks */}
              {filteredTasks.map((task) => (
                <div
                  key={`task-${task.id}`}
                  className="notification-item task"
                  onClick={() => handleItemClick(task)}
                >
                  <div className="notification-icon task">✅</div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {task.title}
                      <span className="notification-badge">Pending Task</span>
                    </div>
                    <div className="notification-message">
                      {task.task_time 
                        ? `Scheduled for ${task.task_time}` 
                        : "No specific time"
                      }
                    </div>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {task.task_time || "All day"}
                      </span>
                      <span className="notification-date">
                        {task.task_date}
                      </span>
                    </div>
                    
                    <CountdownTimer
                      targetTime={task.task_time || ""}
                      date={task.task_date}
                      type="task"
                      isCompleted={task.completed}
                      onComplete={() => handleTimerComplete(task, "task")} // ✅ NEW: onComplete handler
                    />
                  </div>
                  <div className="notification-actions">
                    <button
                      className="notification-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        completeTask(task.id);
                      }}
                    >
                      Complete
                    </button>
                    
                    {/* ✅ NEW: Alert Me button */}
                    <button
                      className={`notification-alert-btn ${alertItems.has(`task-${task.id}`) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAlert(task, "task");
                      }}
                      title={alertItems.has(`task-${task.id}`) ? "Alert is set" : "Set alert for when time is up"}
                    >
                      {alertItems.has(`task-${task.id}`) ? "🔔 Alert Set" : "🔔 Alert Me"}
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

              {/* Render Events */}
              {filteredEvents.map((event) => (
                <div
                  key={`event-${event.id}`}
                  className="notification-item event"
                  onClick={() => handleItemClick(event)}
                >
                  <div className="notification-icon event">📅</div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {event.title}
                      <span className="notification-badge">
                        {event.type || "Event"}
                      </span>
                    </div>
                    <div className="notification-message">
                      {event.description || "No description"}
                    </div>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {event.event_time || "All day"}
                      </span>
                      <span className="notification-date">
                        {event.event_date}
                      </span>
                    </div>
                    
                    <CountdownTimer
                      targetTime={event.event_time || ""}
                      date={event.event_date}
                      type="event"
                      onComplete={() => handleTimerComplete(event, "event")} // ✅ NEW: onComplete handler
                    />
                  </div>
                  <div className="notification-actions">
                    {/* ✅ NEW: Alert Me button for events */}
                    <button
                      className={`notification-alert-btn ${alertItems.has(`event-${event.id}`) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAlert(event, "event");
                      }}
                      title={alertItems.has(`event-${event.id}`) ? "Alert is set" : "Set alert for when time is up"}
                    >
                      {alertItems.has(`event-${event.id}`) ? "🔔 Alert Set" : "🔔 Alert Me"}
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
            </div>
          </div>
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">📅</div>
            <h2 className="notification-empty-text">
              {activeTab === "task" && "No pending tasks"}
              {activeTab === "event" && "No events today"}
              {activeTab === "all" && "No notifications today"}
            </h2>
            <p className="notification-empty-subtext">
              {activeTab === "task" && "All your tasks are completed or dismissed!"}
              {activeTab === "event" && "You don't have any events scheduled for today."}
              {activeTab === "all" && "You don't have any pending tasks or events for today."}
            </p>
            <button
              className="notification-action"
              onClick={() => navigate("/calendar/day")}
            >
              {activeTab === "task" && "Add New Task"}
              {activeTab === "event" && "Add New Event"}
              {activeTab === "all" && "Go to Calendar"}
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

      {/* ✅ NEW: Alert Popups */}
      {Array.from(activeAlerts.entries()).map(([itemId, alertData]) => {
        const item = alertData.task || alertData.event;
        const type = alertData.task ? 'task' : 'event';
        
        return (
          <div key={itemId} className="alert-popup-overlay" onClick={() => closeAlert(itemId)}>
            <div className="alert-popup" onClick={(e) => e.stopPropagation()}>
              <div className="alert-header">
                <span className="alert-icon">⏰</span>
                <h3>Time's Up!</h3>
                <button className="alert-close" onClick={() => closeAlert(itemId)}>×</button>
              </div>
              
              <div className="alert-content">
                <div className="alert-item-type">{type === 'task' ? '📋 Task' : '📅 Event'}</div>
                <div className="alert-title">{item?.title}</div>
                {type === 'event' && (item as CalendarEvent).description && (
                  <div className="alert-description">{(item as CalendarEvent).description}</div>
                )}
              </div>
              
              <div className="alert-actions">
                {type === 'task' && (
                  <button
                    className="alert-action-btn complete"
                    onClick={() => {
                      completeTask((item as Task).id);
                      closeAlert(itemId);
                    }}
                  >
                    Complete Task
                  </button>
                )}
                
                <button
                  className="alert-action-btn view"
                  onClick={() => {
                    goToNotificationSource(type, item!.id);
                    closeAlert(itemId);
                  }}
                >
                  View {type === 'task' ? 'Task' : 'Event'}
                </button>
                
                <button
                  className="alert-action-btn dismiss"
                  onClick={() => closeAlert(itemId)}
                >
                  OK
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
