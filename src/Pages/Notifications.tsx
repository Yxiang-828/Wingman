import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { useData } from "../context/DataContext";
import { useNotifications } from "../context/NotificationsContext";
import DetailPopup from "../components/Common/DetailPopup";
import { useInView } from 'react-intersection-observer';
import "./Notifications.css";

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    completeTask, 
    showPopupFor, 
    currentPopupItem, 
    closePopup,
    loadMoreNotifications,
    isLoadingMore,
    hasMoreTasks,
    hasMoreEvents
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
        
        // Only load today and FUTURE data, not past
        const startDate = format(today, "yyyy-MM-dd");
        
        console.log(`Notifications: Loading data from ${startDate} with 14 days range`);
        await batchFetchData(startDate, 14); // Today + 14 days future
        
        console.log("Notifications: Data fetch complete");
      } catch (error) {
        console.error("Error loading notifications data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
  }, [batchFetchData]);

const formatDateHeader = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  } else {
    return date.toLocaleDateString(undefined, {
      weekday: 'long', 
      month: 'long', 
      day: 'numeric'
    });
  }
};

  // Update the handleNotificationClick function
  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    
    // IMPORTANT: Always use popup for completed tasks instead of navigating
    // Find the actual item to show in the popup
    if (notification.type === "task") {
      // Look up the task in cache
      const task = findTaskInCache(notification.sourceId);
      if (task) {
        showPopupFor(task);
        return;
      }
    } else if (notification.type === "event") {
      // Look up the event in cache
      const event = findEventInCache(notification.sourceId);
      if (event) {
        showPopupFor(event);
        return;
      }
    }
    
    // Only navigate if we couldn't find the item for the popup
    goToNotificationSource(notification.type, notification.sourceId);
  };

  // Helper functions to find items in cache
  const findTaskInCache = (taskId: number): any | undefined => {
    for (const weekId in taskCache) {
      for (const dateKey in taskCache[weekId]) {
        const task = taskCache[weekId][dateKey].find((t: any) => t.id === taskId);
        if (task) return task;
      }
    }
    return undefined;
  };

  const findEventInCache = (eventId: number): any | undefined => {
    for (const weekId in eventCache) {
      for (const dateKey in eventCache[weekId]) {
        const event = eventCache[weekId][dateKey].find((e: any) => e.id === eventId);
        if (event) return event;
      }
    }
    return undefined;
  };

  // Filter notifications based on active tab
  const filteredNotifications = useMemo(() => {
    // Get today's date at 00:00:00 for proper comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log("Filtering notifications for today and future only");
    return notifications
      .filter((notification) => {
        // First filter by type if needed
        if (activeTab !== "all" && notification.type !== activeTab) return false;
        
        // Then filter by date - ONLY show today and future
        const notificationDate = new Date(notification.date);
        notificationDate.setHours(0, 0, 0, 0); // Compare dates only, not times
        
        return notificationDate >= today; // Only include today and future dates
      })
      .sort((a, b) => {
        // Sort by date (oldest first for upcoming items)
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [notifications, activeTab]);

  // Trigger loading more items when scrolling
  useEffect(() => {
    if (inView && !isLoadingMore) {
      if (activeTab === 'task' && hasMoreTasks) {
        loadMoreNotifications('task');
      } else if (activeTab === 'event' && hasMoreEvents) {
        loadMoreNotifications('event');
      } else if (activeTab === 'all') {
        if (hasMoreTasks) loadMoreNotifications('task');
        if (hasMoreEvents) loadMoreNotifications('event');
      }
    }
  }, [inView, isLoadingMore, activeTab, hasMoreTasks, hasMoreEvents, loadMoreNotifications]);

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
            {/* Group by date */}
            {Object.entries(
              filteredNotifications.reduce((groups, notification) => {
                const date = notification.date;
                if (!groups[date]) groups[date] = [];
                groups[date].push(notification);
                return groups;
              }, {} as Record<string, any[]>)
            ).map(([date, dateNotifications]) => (
              <div key={date} className="notification-date-group">
                <div className="notification-date-header">
                  {formatDateHeader(date)}
                </div>
                {dateNotifications.map((notification) => (
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
            ))}
          </div>
        ) : (
          <div className="notification-empty">
            <div className="notification-empty-icon">📅</div>
            <h2 className="notification-empty-text">No upcoming notifications</h2>
            <p className="notification-empty-subtext">
              You don't have any tasks or events scheduled for today or upcoming days.
            </p>
          </div>
        )}
        
        <div className="notifications-pagination">
          {filteredNotifications.length > 0 && (
            <>
              <div ref={loadMoreRef} className="load-more-trigger">
                {isLoadingMore && <div className="loading-spinner small"></div>}
                {!isLoadingMore && hasMoreTasks && (
                  <div className="scroll-indicator">
                    <div className="scroll-indicator-text">Scroll for more</div>
                    <div className="scroll-indicator-arrow">↓</div>
                  </div>
                )}
              </div>
              
              {/* Simplify pagination status */}
              <div className="pagination-status">
                Showing {filteredNotifications.length} notifications
                {hasMoreTasks || hasMoreEvents ? ' (scroll for more)' : ''}
              </div>
            </>
          )}
        </div>
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