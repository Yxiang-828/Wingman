import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, subDays } from "date-fns";
import { useData } from "../context/DataContext";
import { useNotifications } from "../context/NotificationsContext";
import DetailPopup from "../components/Common/DetailPopup";
import "./Notifications.css";

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);

  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    completeTask, 
    showPopupFor, 
    currentPopupItem, 
    closePopup,
  } = useNotifications();
  
  const { batchFetchData, taskCache, eventCache } = useData();
  
  // Get tab from URL if provided
  const query = new URLSearchParams(location.search);
  const tabFromUrl = query.get("tab");

  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl === "task" || tabFromUrl === "event" ? tabFromUrl : "all"
  );
  const [isLoading, setIsLoading] = useState(true);

  // Navigate to a specific notification
  const goToNotificationSource = (type: string, id: number) => {
    if (type === "task") {
      navigate(`/calendar/day?highlight=task-${id}`);
    } else {
      navigate(`/calendar/day?highlight=event-${id}`);
    }
  };
  
  // Fetch notifications data when component mounts
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        console.log("Notifications: Starting data load");
        
        // Get today's date for reference
        const today = new Date();
        
        // Load 14 days BACK and 7 days FORWARD - THIS IS CRITICAL
        const startDate = format(subDays(today, 14), "yyyy-MM-dd");
        
        console.log(`Notifications: Loading data from ${startDate} with 21 days range`);
        await batchFetchData(startDate, 21); // 14 days past + 7 days future
        
        console.log("Notifications: Data fetch complete");
        console.log("Task cache keys:", Object.keys(taskCache));
        console.log("Event cache keys:", Object.keys(eventCache));
      } catch (error) {
        console.error("Error loading notifications data:", error);
      } finally {
        // IMPORTANT: Always set loading to false to avoid infinite loading state
        setIsLoading(false);
      }
    };
    
    loadNotifications();
  }, [batchFetchData]);

  // Handle notification item click
  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // Use the goToNotificationSource function for direct navigation
    if (notification.actionable) {
      goToNotificationSource(notification.type, notification.sourceId);
      return;
    }
    
    // Find the actual item to show in the popup
    if (notification.type === "task") {
      const task = Object.values(taskCache || {})
        .flatMap(week => Object.values(week || {})
        .flatMap(day => day))
        .find(t => t.id === notification.sourceId);
      
      if (task) showPopupFor(task);
    } else if (notification.type === "event") {
      const event = Object.values(eventCache || {})
        .flatMap(week => Object.values(week || {})
        .flatMap(day => day))
        .find(e => e.id === notification.sourceId);
      
      if (event) showPopupFor(event);
    }
  };

  // Filter notifications based on active tab
  const filteredNotifications = useMemo(() => {
    console.log("Raw notifications count:", notifications.length);
    
    // DEBUG: Check notifications content
    if (notifications.length > 0) {
      console.log("Sample notification:", notifications[0]);
    } else {
      console.log("No notifications available");
    }

    // IMPORTANT: Do NOT filter by date - we want to see past notifications too!
    return notifications
      .filter((notification) => {
        // Only filter by type based on active tab
        if (activeTab === "all") return true;
        return notification.type === activeTab;
      })
      .sort((a, b) => {
        // Sort newest first
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [notifications, activeTab]);

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
        </button>
        <button
          className={`notifications-tab ${activeTab === "task" ? "active" : ""}`}
          onClick={() => setActiveTab("task")}
        >
          Tasks
        </button>
        <button
          className={`notifications-tab ${activeTab === "event" ? "active" : ""}`}
          onClick={() => setActiveTab("event")}
        >
          Events
        </button>
      </div>

      <div className="notifications-list" ref={listRef}>
        {isLoading ? (
          <div className="notifications-loading">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="notifications-items">
            {filteredNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.type} ${notification.read ? "" : "unread"}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={`notification-icon ${notification.type}`}>
                  {notification.type === "task" ? "✓" : "📅"}
                </div>
                <div className="notification-content">
                  <div className="notification-title">
                    {notification.title}
                  </div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-meta">
                    {notification.date}
                    {notification.time && ` at ${notification.time}`}
                  </div>
                </div>
                {notification.type === "task" && notification.actionable && (
                  <div className="notification-actions">
                    <button
                      className="notification-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        completeTask(notification.sourceId);
                      }}
                    >
                      Complete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">🎉</div>
            <h2 className="notification-empty-text">All caught up!</h2>
            <p className="notification-empty-subtext">
              You don't have any notifications right now.
            </p>
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
    </div>
  );
};

export default Notifications;