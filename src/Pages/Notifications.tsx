import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import {
  navigateToTaskDetails,
  navigateToEventDetails,
} from "../services/NavigationService";
import "./Notifications.css";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  date: string;
  time: string;
  read: boolean;
  actionable: boolean;
  actionText?: string;
  sourceId: number;
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();

  // Get global data
  const { tasks, events, loading, toggleTask } = useData();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readMap, setReadMap] = useState<Record<number, boolean>>({});

  // Generate notifications from tasks and events
  useEffect(() => {
    if (loading) return;

    // Create notifications from tasks
    const taskNotifications = tasks.map((task) => ({
      id: task.id,
      title: task.completed ? "Task Completed" : "Task Reminder",
      message: task.text,
      type: "task",
      date: task.date,
      time: task.time || "",
      read: readMap[task.id] || false,
      actionable: true,
      actionText: task.completed ? "Mark Incomplete" : "Mark Complete",
      sourceId: task.id,
    }));

    // Create notifications from events
    const eventNotifications = events.map((event) => ({
      id: event.id + 10000, // Ensure unique IDs across notifications
      title: event.title,
      message: `${event.type} event at ${event.time}`,
      type: "event",
      date: event.date,
      time: event.time,
      read: readMap[event.id + 10000] || false,
      actionable: true,
      actionText: "View Details",
      sourceId: event.id,
    }));

    // Combine and sort by date (newest first)
    const combined = [...taskNotifications, ...eventNotifications];
    combined.sort((a, b) => {
      // Compare dates
      const dateComparison =
        new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;

      // If same date, compare times
      return a.time.localeCompare(b.time);
    });

    setNotifications(combined);
  }, [tasks, events, loading, readMap]);

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    return notification.type === activeTab;
  });

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Calculate type counts
  const taskCount = notifications.filter((n) => n.type === "task").length;
  const eventCount = notifications.filter((n) => n.type === "event").length;
  const messageCount = notifications.filter((n) => n.type === "message").length;
  const systemCount = notifications.filter((n) => n.type === "system").length;

  // Mark notification as read
  const handleMarkAsRead = (id: number) => {
    setReadMap((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  // Handle notification action (like toggling task or viewing event)
  const handleAction = async (notification: Notification) => {
    if (notification.type === "task") {
      // Find the corresponding task
      const task = tasks.find((t) => t.id === notification.sourceId);
      if (task) {
        await toggleTask(task);
      }
    } else if (notification.type === "event") {
      // Navigate to the event in day view
      const event = events.find((e) => e.id === notification.sourceId);
      if (event) {
        navigateToEventDetails(event);
      }
    }

    // Mark as read after action
    handleMarkAsRead(notification.id);
  };

  // Dismiss a notification
  const handleDismiss = (id: number) => {
    setReadMap((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  // Clear all notifications
  const handleClearAll = () => {
    const allIds = notifications.map((n) => n.id);
    const newReadMap = allIds.reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {} as Record<number, boolean>);

    setReadMap(newReadMap);
  };

  // Navigate to the source of a notification
  const handleNavigateToSource = (notification: Notification) => {
    if (notification.type === "task") {
      const task = tasks.find((t) => t.id === notification.sourceId);
      if (task) {
        navigateToTaskDetails(task);
      }
    } else if (notification.type === "event") {
      const event = events.find((e) => e.id === notification.sourceId);
      if (event) {
        navigateToEventDetails(event);
      }
    }

    // Mark as read when navigating
    handleMarkAsRead(notification.id);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task":
        return "✓";
      case "event":
        return "📅";
      case "message":
        return "💬";
      case "system":
        return "⚙️";
      default:
        return "📌";
    }
  };

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h1 className="notifications-title">
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </h1>
        <button
          className="notifications-clear-all"
          onClick={handleClearAll}
          disabled={notifications.length === 0}
        >
          <span>🗑️</span> Clear All
        </button>
      </div>

      <div className="notifications-tabs">
        <button
          className={`notifications-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All{" "}
          <span className="notifications-count">{notifications.length}</span>
        </button>
        <button
          className={`notifications-tab ${
            activeTab === "task" ? "active" : ""
          }`}
          onClick={() => setActiveTab("task")}
        >
          Tasks <span className="notifications-count">{taskCount}</span>
        </button>
        <button
          className={`notifications-tab ${
            activeTab === "event" ? "active" : ""
          }`}
          onClick={() => setActiveTab("event")}
        >
          Events <span className="notifications-count">{eventCount}</span>
        </button>
        <button
          className={`notifications-tab ${
            activeTab === "message" ? "active" : ""
          }`}
          onClick={() => setActiveTab("message")}
        >
          Messages <span className="notifications-count">{messageCount}</span>
        </button>
        <button
          className={`notifications-tab ${
            activeTab === "system" ? "active" : ""
          }`}
          onClick={() => setActiveTab("system")}
        >
          System <span className="notifications-count">{systemCount}</span>
        </button>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${
                notification.read ? "" : "unread"
              }`}
              onClick={() => handleNavigateToSource(notification)}
            >
              <div className={`notification-icon ${notification.type}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title">
                  {notification.title}
                  {!notification.read && (
                    <span className="notification-badge">New</span>
                  )}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-meta">
                  <span className="notification-time">{notification.time}</span>
                  <span className="notification-time">
                    {formatDate(notification.date)}
                  </span>
                </div>
              </div>
              <div className="notification-actions">
                {notification.actionable && (
                  <button
                    className="notification-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(notification);
                    }}
                  >
                    {notification.actionText || "View"}
                  </button>
                )}
                <button
                  className="notification-dismiss"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(notification.id);
                  }}
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">🔔</div>
            <div className="notification-empty-text">
              No notifications to display
            </div>
            <div className="notification-empty-subtext">
              When you have new tasks, events, or messages, they'll appear here.
            </div>
            <button
              className="notification-action"
              onClick={() => navigate("/calendar/day")}
            >
              Go to Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
