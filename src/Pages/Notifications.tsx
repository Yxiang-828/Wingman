import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import DetailPopup from "../components/Common/DetailPopup";
import { useData } from "../context/DataContext";
import { format } from "date-fns";
import "./Notifications.css";
import type { Task } from '../api/Task';
import type { CalendarEvent } from '../api/Calendar';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Try/catch to handle potential missing context error
  try {
    const { taskCache, eventCache } = useData();
    const {
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      completeTask: toggleTask,
      showPopupFor,
      currentPopupItem,
      closePopup
    } = useNotifications();

    // Get tab from URL if provided
    const query = new URLSearchParams(location.search);
    const tabFromUrl = query.get('tab');
    
    const [activeTab, setActiveTab] = useState<string>(
      tabFromUrl === 'task' || tabFromUrl === 'event' ? tabFromUrl : 'all'
    );

    // Filter notifications based on active tab
    const filteredNotifications = useMemo(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      return notifications
        .filter((notification) => {
          // Keep events in the future
          if (notification.type === "event" && notification.date >= todayStr) {
            return true;
          }
          
          // Keep tasks that are not completed and in the future
          if (notification.type === "task" && !notification.completed && notification.date >= todayStr) {
            return true;
          }
          
          return false;
        })
        .filter((notification) => {
          if (activeTab === "all") return true;
          return notification.type === activeTab;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, displayLimit);
    }, [notifications, activeTab, displayLimit]);
    
    // Load more when scrolling to the bottom
    useEffect(() => {
      const handleScroll = () => {
        if (!listRef.current || !hasMoreItems) return;
        
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        
        if (scrollTop + clientHeight >= scrollHeight - 50) {
          setDisplayLimit(prev => prev + 10);
        }
      };
      
      const listElement = listRef.current;
      if (listElement) {
        listElement.addEventListener('scroll', handleScroll);
      }
      
      return () => {
        if (listElement) {
          listElement.removeEventListener('scroll', handleScroll);
        }
      };
    }, [hasMoreItems]);
    
    // Check if we've loaded all items
    useEffect(() => {
      const totalFilteredItems = notifications.filter(n => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        if (n.type === "event" && n.date >= todayStr) return true;
        if (n.type === "task" && !n.completed && n.date >= todayStr) return true;
        return false;
      }).length;
      
      setHasMoreItems(displayLimit < totalFilteredItems);
    }, [notifications, displayLimit]);
    
    // Handle button action (e.g. Mark as complete)
    const handleAction = async (notification: any) => {
      if (notification.type === "task") {
        await toggleTask(notification.sourceId);
      } else if (notification.type === "event") {
        const event = events.find((e: CalendarEvent) => e.id === notification.sourceId);
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
        // Make sure taskCache exists and has entries before searching
        const allTasks = Object.values(taskCache || {}).flat();
        const task = allTasks.find((t) => t.id === notification.sourceId);
        
        if (task) {
          showPopupFor(task);
        } else {
          console.warn(`Task with ID ${notification.sourceId} not found`);
          // Optionally show a message to the user that the task wasn't found
        }
      } else if (notification.type === "event") {
        // Make sure eventCache exists and has entries before searching
        const allEvents = Object.values(eventCache || {}).flat();
        const event = allEvents.find((e: CalendarEvent) => e.id === notification.sourceId);
        
        if (event) {
          showPopupFor(event);
        } else {
          console.warn(`Event with ID ${notification.sourceId} not found`);
          // Optionally show a message to the user that the event wasn't found
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

    // Get tasks and events from the cache
    const tasks: Task[] = useMemo(() => {
      const allTasks: Task[] = [];
      Object.values(taskCache).forEach(weekData => {
        Object.values(weekData).forEach(tasksArray => {
          allTasks.push(...tasksArray);
        });
      });
      return allTasks;
    }, [taskCache]);

    const events: CalendarEvent[] = useMemo(() => {
      const allEvents: CalendarEvent[] = [];
      Object.values(eventCache).forEach(weekData => {
        Object.values(weekData).forEach(eventsArray => {
          allEvents.push(...eventsArray);
        });
      });
      return allEvents;
    }, [eventCache]);

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
            Tasks <span className="notifications-count">{notifications.filter(n => n.type === "task").length}</span>
          </button>
          <button
            className={`notifications-tab ${
              activeTab === "event" ? "active" : ""
            }`}
            onClick={() => setActiveTab("event")}
          >
            Events <span className="notifications-count">{notifications.filter(n => n.type === "event").length}</span>
          </button>
        </div>

        <div className="notifications-list" ref={listRef}>
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
          
          {hasMoreItems && (
            <div className="loading-more">Loading more items...</div>
          )}
        </div>
        
        {/* Popup for detailed view */}
        {currentPopupItem && (
          <DetailPopup
            item={currentPopupItem}
            onClose={closePopup}
            onComplete={toggleTask}
            container={document.body}
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
