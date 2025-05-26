import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, addDays, startOfWeek } from "date-fns";
import { useData } from "../context/DataContext";
import { useNotifications } from "../context/NotificationsContext";
import DetailPopup from "../components/Common/DetailPopup";
import "./Notifications.css";

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const listRef = useRef<HTMLDivElement>(null);
  // Add a mount-only reference
  const hasInitialized = useRef(false);

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
    hasMoreEvents,
  } = useNotifications();

  const { batchFetchData, taskCache, eventCache, ensureCurrentWeekLoaded } =
    useData();

  // Get tab from URL if provided
  const query = new URLSearchParams(location.search);
  const tabFromUrl = query.get("tab");

  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl === "task" || tabFromUrl === "event" ? tabFromUrl : "all"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [visibleDays, setVisibleDays] = useState<number>(7); // Start with 7 days
  const [hasMoreDays, setHasMoreDays] = useState<boolean>(true);
  // NEW: Track total loaded notifications to prevent excess loading
  const [totalLoaded, setTotalLoaded] = useState<number>(0);
  const MAX_NOTIFICATIONS = 100; // Reasonable maximum limit

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
    // Skip if already initialized
    if (hasInitialized.current) {
      return;
    }

    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        console.log("Notifications: Starting one-time data load");

        // Get today's date for reference
        const today = new Date();

        // OPTIMIZATION: First ensure current week is loaded from fixed cache
        await ensureCurrentWeekLoaded();
        console.log("📅 Using optimized fixed cache for current week");

        // Then load additional data for future dates - BUT ONLY ONCE
        console.log(
          `📅 Loading additional data from current week + 1 with 7 days range`
        );

        // Calculate next week's start date to avoid duplicating data
        const nextWeekStart = addDays(startOfWeek(today), 7);
        const nextWeekDate = format(nextWeekStart, "yyyy-MM-dd");

        // Only load data that's not already in fixed cache
        await batchFetchData(nextWeekDate, 7);
        console.log("Notifications: Next week data fetch complete");

        console.log("Notifications: Data fetch complete");
      } catch (error) {
        console.error("Error loading notifications data:", error);
      } finally {
        setIsLoading(false);
        hasInitialized.current = true; // Mark as initialized
      }
    };

    loadNotifications();
  }, [ensureCurrentWeekLoaded, batchFetchData]); // Remove nextWeekLoaded from dependencies

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
        weekday: "long",
        month: "long",
        day: "numeric",
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
        const task = taskCache[weekId][dateKey].find(
          (t: any) => t.id === taskId
        );
        if (task) return task;
      }
    }
    return undefined;
  };

  const findEventInCache = (eventId: number): any | undefined => {
    for (const weekId in eventCache) {
      for (const dateKey in eventCache[weekId]) {
        const event = eventCache[weekId][dateKey].find(
          (e: any) => e.id === eventId
        );
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

    // Calculate the earliest date to show (today minus visibleDays)
    const earliestDate = new Date(today);
    earliestDate.setDate(earliestDate.getDate() - visibleDays);

    console.log(
      `Showing notifications from ${earliestDate.toISOString()} to future`
    );

    return notifications
      .filter((notification) => {
        // First filter by type if needed
        if (activeTab !== "all" && notification.type !== activeTab)
          return false;

        // Then filter by date range
        const notificationDate = new Date(notification.date);
        notificationDate.setHours(0, 0, 0, 0);

        return notificationDate >= earliestDate; // Only include dates within range
      })
      .sort((a, b) => {
        // Sort by date (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [notifications, activeTab, visibleDays]);

  // Update the loadMore function
  const loadMoreDays = () => {
    // Don't load more if we're already loading or at the limit
    if (isLoadingMore || totalLoaded >= MAX_NOTIFICATIONS) {
      return;
    }

    // Increase visible days to show more historical notifications
    setVisibleDays((prev) => prev + 7); // Load 7 more days

    // Check if we've reached the limit of data
    if (visibleDays >= 28) {
      // Stop after 28 days (4 weeks)
      setHasMoreDays(false);
    }

    // Track total loaded for safety - use current count
    const newTotal = totalLoaded + filteredNotifications.length;
    setTotalLoaded(newTotal);

    console.log(
      `Loaded ${visibleDays + 7} days of notifications, total count: ${newTotal}`
    );

    // Only fetch more data if needed AND not already fetched
    if (
      visibleDays >= 14 &&
      (hasMoreTasks || hasMoreEvents) &&
      !isLoadingMore
    ) {
      console.log("Fetching additional historical data...");

      // Only fetch one type at a time to prevent duplicate calls
      if (activeTab === "task" && hasMoreTasks) {
        loadMoreNotifications("task");
      } else if (activeTab === "event" && hasMoreEvents) {
        loadMoreNotifications("event");
      } else if (activeTab === "all") {
        // Only load the type with more items
        if (hasMoreTasks) loadMoreNotifications("task");
        else if (hasMoreEvents) loadMoreNotifications("event");
      }
    }
  };

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
          className={`notifications-tab ${
            activeTab === "all" ? "active" : ""
          }`}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
        <button
          className={`notifications-tab ${
            activeTab === "task" ? "active" : ""
          }`}
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
                    className={`notification-item ${notification.type} ${
                      notification.read ? "" : "unread"
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`notification-icon ${notification.type}`}>
                      {notification.type === "task" ? "✓" : "📅"}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">
                        {notification.title}
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-meta">
                        {notification.date}
                        {notification.time && ` at ${notification.time}`}
                      </div>
                    </div>
                    {notification.type === "task" &&
                      notification.actionable && (
                        <div className="notification-actions">
                          <button
                            className="notification-action-btn"
                            onClick={(
                              e: React.MouseEvent<HTMLButtonElement>
                            ) => {
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
            <h2 className="notification-empty-text">
              No upcoming notifications
            </h2>
            <p className="notification-empty-subtext">
              You don't have any tasks or events scheduled for today or upcoming
              days.
            </p>
          </div>
        )}

        <div className="notifications-pagination">
          {filteredNotifications.length > 0 && hasMoreDays && !isLoading && (
            <button
              className="load-more-btn"
              onClick={loadMoreDays}
              disabled={isLoadingMore || totalLoaded >= MAX_NOTIFICATIONS}
            >
              {isLoadingMore ? (
                <div className="loading-spinner small"></div>
              ) : totalLoaded >= MAX_NOTIFICATIONS ? (
                "Maximum notifications loaded"
              ) : (
                "Load Previous 7 Days"
              )}
            </button>
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
