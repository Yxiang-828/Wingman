import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useData } from "../context/DataContext";
import { useNotifications } from "../context/NotificationsContext";
import DetailPopup from "../components/Common/DetailPopup";
import "./Notifications.css";

const Notifications: React.FC = () => {
  // Add classes to body for glow effect when component mounts
  useEffect(() => {
    // Remove any other theme classes first
    document.body.classList.remove("immersive-mode");

    // Remove all mood classes
    ["happy", "sad", "neutral", "excited", "tired", "relaxed"].forEach((mood) => {
      document.body.classList.remove(`mood-${mood}`);
    });

    // Add the notifications mode class
    document.body.classList.add("notifications-mode");

    return () => {
      document.body.classList.remove("notifications-mode");
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);

  try {
    const { notifications, unreadCount, markAsRead, markAllAsRead, completeTask: toggleTask, showPopupFor, currentPopupItem, closePopup } = useNotifications();
    const { taskCache, eventCache } = useData();

    // Get tab from URL if provided
    const query = new URLSearchParams(location.search);
    const tabFromUrl = query.get("tab");

    const [activeTab, setActiveTab] = useState<string>(
      tabFromUrl === "task" || tabFromUrl === "event" ? tabFromUrl : "all"
    );

    // Filter notifications based on active tab
    const filteredNotifications = useMemo(() => {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      return notifications
        .filter((notification) => {
          // Keep events in the future
          if (notification.type === "event" && notification.date >= todayStr) {
            return true;
          }

          // Keep tasks that are not completed and in the future
          if (
            notification.type === "task" &&
            !notification.completed &&
            notification.date >= todayStr
          ) {
            return true;
          }

          return false;
        })
        .filter((notification) => {
          if (activeTab === "all") return true;
          return notification.type === activeTab;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 10);
    }, [notifications, activeTab]);

    // Handle button action (e.g. Mark as complete)
    const handleAction = async (notification: any) => {
      if (notification.type === "task") {
        await toggleTask(notification.sourceId);
        // Update notification UI to reflect completion
        markAsRead(notification.id);
      }
    };

    // Show details for a notification
    const handleShowDetails = (notification: any) => {
      // Mark as read
      markAsRead(notification.id);

      // Find the corresponding task or event
      if (notification.type === "task") {
        const allTasks = Object.values(taskCache || {}).flatMap((dateObj) =>
          Object.values(dateObj).flat()
        );
        const task = allTasks.find((t) => t.id === notification.sourceId);

        if (task) {
          showPopupFor(task);
        } else {
          console.error(`Task not found: ${notification.sourceId}`);
        }
      } else if (notification.type === "event") {
        const allEvents = Object.values(eventCache || {}).flatMap((dateObj) =>
          Object.values(dateObj).flat()
        );
        const event = allEvents.find((e) => e.id === notification.sourceId);

        if (event) {
          showPopupFor(event);
        } else {
          console.error(`Event not found: ${notification.sourceId}`);
        }
      }
    };

    // Format date for display
    const getDateDisplay = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        const now = new Date();

        // Check if it's today
        if (date.toDateString() === now.toDateString()) {
          return "Today";
        }

        // Check if it's tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (date.toDateString() === tomorrow.toDateString()) {
          return "Tomorrow";
        }

        // Otherwise return formatted date
        return format(date, "MMM d");
      } catch (e) {
        return dateStr;
      }
    };

    return (
      <>
        {/* Floating notification icons */}
        <div className="notifications-floating-icons">
          <img src="/assets/bell-icon.png" className="notification-floating-icon notification-icon-1" alt="" />
          <img src="/assets/calendar-icon.png" className="notification-floating-icon notification-icon-2" alt="" />
          <img src="/assets/task-icon.png" className="notification-floating-icon notification-icon-3" alt="" />
          <img src="/assets/alert-icon.png" className="notification-floating-icon notification-icon-4" alt="" />
        </div>

        <div className="notifications-container">
          <div className="notifications-header">
            <h1 className="notifications-title">Notifications</h1>
            <div className="notifications-actions">
              <button
                className="notifications-mark-all"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark All as Read
              </button>
            </div>
          </div>

          <div className="notifications-tabs">
            <button
              className={`notifications-tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All <span className="notifications-count">{notifications.length}</span>
            </button>

            <button
              className={`notifications-tab ${activeTab === "task" ? "active" : ""}`}
              onClick={() => setActiveTab("task")}
            >
              Tasks
            </button>

            <button
              className={`notifications-tab ${
                activeTab === "event" ? "active" : ""
              }`}
              onClick={() => setActiveTab("event")}
            >
              Events
            </button>
          </div>

          <div className="notifications-list" ref={listRef}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div
                  key={`notification-${notification.id}`}
                  className={`notification-item ${notification.read ? "" : "unread"} ${notification.type}`}
                  onClick={() => handleShowDetails(notification)}
                >
                  <div className={`notification-icon ${notification.type}`}>
                    {notification.type === "task" ? "✓" : "📅"}
                  </div>

                  <div className="notification-content">
                    <div className="notification-title">
                      {notification.title}
                      {notification.read ? null : (
                        <span className="notification-badge">New</span>
                      )}
                    </div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-meta">
                      {notification.time && (
                        <span className="notification-time">{notification.time}</span>
                      )}
                      <span className="notification-date">
                        {getDateDisplay(notification.date)}
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
                        Mark Done
                      </button>
                    )}
                    {notification.type === "event" && (
                      <button
                        className="notification-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowDetails(notification);
                        }}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="notification-empty">
                <div className="notification-empty-icon">🎉</div>
                <h3 className="notification-empty-text">All caught up!</h3>
                <p className="notification-empty-subtext">
                  You don't have any {activeTab !== "all" ? activeTab : ""} notifications
                  right now.
                </p>
                <button
                  className="notification-action"
                  onClick={() => navigate("/calendar/day")}
                >
                  Add Task
                </button>
              </div>
            )}
          </div>

          {/* Popup for detailed view with View in Calendar option */}
          {currentPopupItem && (
            <DetailPopup
              item={currentPopupItem}
              onClose={closePopup}
              onComplete={toggleTask}
              container={document.body}
            />
          )}
        </div>
      </>
    );
  } catch (error) {
    console.error("Error rendering notifications:", error);
    return <div className="error-state">Error loading notifications</div>;
  }
};

export default Notifications;