import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import DetailPopup from "../components/Common/DetailPopup";
import { useData } from "../context/DataContext";
import { format } from "date-fns";
import "./Notifications.css";

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  
  // Try/catch to handle potential missing context error
  try {
    const { tasks, events } = useData();
    const {
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      completeTask,
      showPopupFor,
      currentPopupItem,
      closePopup
    } = useNotifications();

    const [activeTab, setActiveTab] = useState<string>("all");

    // Filter notifications based on active tab
    const filteredNotifications = notifications.filter((notification) => {
      if (activeTab === "all") return true;
      return notification.type === activeTab;
    });

    // Calculate type counts
    const taskCount = notifications.filter((n) => n.type === "task").length;
    const eventCount = notifications.filter((n) => n.type === "event").length;

    // Handle button action (e.g. Mark as complete)
    const handleAction = async (notification: any) => {
      if (notification.type === "task") {
        await completeTask(notification.sourceId);
      } else if (notification.type === "event") {
        const event = events.find((e) => e.id === notification.sourceId);
        if (event) {
          showPopupFor(event);
        }
      }
    };

    // Show details for a notification
    const handleShowDetails = (notification: any) => {
      // Mark as read
      markAsRead(notification.id);
      
      // Find the corresponding task or event
      if (notification.type === "task") {
        const task = tasks.find((t) => t.id === notification.sourceId);
        if (task) {
          showPopupFor(task);
        }
      } else if (notification.type === "event") {
        const event = events.find((e) => e.id === notification.sourceId);
        if (event) {
          showPopupFor(event);
        }
      }
    };

    // Clear all notifications
    const handleClearAll = () => {
      notifications.forEach(notification => {
        dismissNotification(notification.id);
      });
    };

    // Get icon for notification type
    const getNotificationIcon = (type: string) => {
      switch (type) {
        case "task":
          return "✓";
        case "event":
          return "📅";
        default:
          return "📌";
      }
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return format(date, "MMM d");
      } catch (e) {
        return dateStr;
      }
    };

    return (
      <div className="notifications-container">
        <div className="notifications-header">
          <h1 className="notifications-title">
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </h1>
          <div className="notifications-actions">
            <button
              className="notifications-mark-all"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All as Read
            </button>
            <button
              className="notifications-clear-all"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
            >
              <span>🗑️</span> Clear All
            </button>
          </div>
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
        </div>

        <div className="notifications-list">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${
                  notification.read ? "" : "unread"
                } ${notification.type}`}
                onClick={() => handleShowDetails(notification)}
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
                    {notification.time && (
                      <span className="notification-time">{notification.time}</span>
                    )}
                    <span className="notification-date">
                      {formatDate(notification.date)}
                    </span>
                  </div>
                </div>
                <div className="notification-actions">
                  {notification.type === "task" && (
                    <button
                      className="notification-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(notification);
                      }}
                    >
                      Mark Complete
                    </button>
                  )}
                  <button
                    className="notification-dismiss"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notification.id);
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
                When you have new tasks or events, they'll appear here.
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
        
        {/* Popup for detailed view */}
        {currentPopupItem && (
          <DetailPopup 
            item={currentPopupItem} 
            onClose={closePopup}
            onComplete={completeTask}
          />
        )}
      </div>
    );
    
  } catch (error) {
    // Fallback UI when context is not available
    return (
      <div className="notifications-container">
        <div className="notifications-header">
          <h1 className="notifications-title">Notifications</h1>
        </div>
        <div className="notification-empty">
          <div className="notification-empty-icon">⚠️</div>
          <div className="notification-empty-text">
            Unable to load notifications
          </div>
          <div className="notification-empty-subtext">
            Please try again later or return to the dashboard.
          </div>
          <button
            className="notification-action"
            onClick={() => navigate("/")}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
};

export default Notifications;
