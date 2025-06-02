import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useData } from "../context/DataContext";
import { getCurrentUserId } from "../utils/auth";
import { getTodayDateString } from "../utils/timeUtils";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";
import DetailPopup from "../components/Common/DetailPopup";
import "./Notifications.css";

// ✅ CATEGORY SECTION COMPONENT
interface CategorySectionProps {
  title: string;
  items: any[];
  icon: string;
  emptyMessage: string;
  categoryType: string;
  showPopupFor: (item: any) => void;
  handleTaskCompletion: (task: Task) => void;
  handleToggleTracking: (event: CalendarEvent) => void;
  handleTaskFailure: (task: Task) => void;
  handleEventTimeUp: (event: CalendarEvent) => void;
  trackingEvents: Set<number>;
  processingTasks: Set<number>;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  items,
  icon,
  emptyMessage,
  categoryType,
  showPopupFor,
  handleTaskCompletion,
  handleToggleTracking,
  handleTaskFailure,
  handleEventTimeUp,
  trackingEvents,
  processingTasks,
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="mission-category-section">
        <div className="mission-category-header">
          <span className="category-icon">{icon}</span>
          <h3 className="category-title">{title}</h3>
          <span className="category-count">0</span>
        </div>
        <div className="mission-category-empty">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // ✅ HELPER: Get category-specific CSS classes
  const getCategoryItemClass = (categoryType: string, item: any): string => {
    switch (categoryType) {
      case "urgent":
        return item.category === "pending-task" ? "active-mission" : "event";
      case "completed":
        return "completed-mission";
      case "failed":
        return "failed-mission";
      case "pastEvents":
        return "event over";
      default:
        return "";
    }
  };

  // ✅ HELPER: Get category-specific icons
  const getCategoryIcon = (categoryType: string, item: any): string => {
    switch (categoryType) {
      case "urgent":
        return item.category === "pending-task" ? "🎯" : "📅";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      case "pastEvents":
        return "📋";
      default:
        return "📝";
    }
  };

  // ✅ HELPER: Get category-specific controls
  const getCategoryControls = (categoryType: string, item: any) => {
    const isTask = "task_date" in item;
    const isEvent = "event_date" in item;
    const isTracking = trackingEvents.has(item.id);
    const isProcessing = processingTasks.has(item.id);

    switch (categoryType) {
      case "urgent":
        if (isTask) {
          return (
            <div className="mission-controls-group">
              {/* ✅ ADD: Timer for tasks */}
              {item.task_time && !item.completed && !item.failed && (
                <CountdownTimer
                  targetTime={item.task_time}
                  date={item.task_date}
                  type="task"
                  isCompleted={item.completed}
                  isFailed={item.failed}
                  onTaskFail={() => handleTaskFailure(item)}
                  onEventReminder={() => handleEventTimeUp(item)}
                  isTracking={false}
                />
              )}
              <TaskCompletionButton
                task={item}
                onComplete={handleTaskCompletion}
                isProcessing={isProcessing}
              />
            </div>
          );
        } else if (isEvent) {
          return (
            <div className="mission-controls-group">
              {(item.event_time) && (
                <CountdownTimer
                  targetTime={item.event_time}
                  date={item.event_date}
                  type="event"
                  isCompleted={false}
                  isFailed={false}
                  onTaskFail={() => handleTaskFailure(item)}
                  onEventReminder={() => handleEventTimeUp(item)}
                  isTracking={isTracking}
                />
              )}
              <EventTrackingButton
                event={item}
                isTracking={isTracking}
                onToggleTracking={handleToggleTracking}
              />
            </div>
          );
        }
        break;
      case "failed":
        return (
          <button
            className="mission-btn retry"
            onClick={(e) => {
              e.stopPropagation();
              // Handle retry logic - reset failed status
              handleTaskCompletion({
                ...item,
                failed: false,
                completed: false,
              });
            }}
          >
            🔄 Retry
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mission-category-section">
      <div className="mission-category-header">
        <span className="category-icon">{icon}</span>
        <h3 className="category-title">{title}</h3>
        <span className="category-count">{items.length}</span>
      </div>
      <div className="mission-category-content">
        {items.map((item) => {
          const isTask = "task_date" in item;
          const itemId = `${isTask ? "task" : "event"}-${item.id}`;

          return (
            <div
              key={itemId}
              className={`mission-item ${getCategoryItemClass(
                categoryType,
                item
              )}`}
              onClick={() => showPopupFor(item)}
            >
              <div className="mission-icon">
                {getCategoryIcon(categoryType, item)}
              </div>

              <div className="mission-content">
                <div className="mission-objective">{item.title}</div>
                <div className="mission-meta">
                  {isTask && item.task_time && (
                    <span className="mission-deadline">{item.task_time}</span>
                  )}
                  {!isTask && item.event_time && (
                    <span className="mission-deadline">{item.event_time}</span>
                  )}
                  {!isTask && item.type && (
                    <span className={`mission-status ${item.type}`}>
                      {item.type}
                    </span>
                  )}
                </div>
              </div>

              <div className="mission-controls">
                {getCategoryControls(categoryType, item)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ✅ MISSION COUNTDOWN TIMER
interface CountdownTimerProps {
  targetTime: string;
  date: string;
  type: "task" | "event";
  isCompleted?: boolean;
  isFailed?: boolean;
  onTaskFail?: () => void;
  onEventReminder?: () => void;
  isTracking?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  date,
  type,
  isCompleted = false,
  isFailed = false,
  onTaskFail,
  onEventReminder,
  isTracking = false,
}) => {
  // ✅ FIXED: Single state object with loading
  const [timerState, setTimerState] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOverdue: false,
    shouldFail: false,
    isLoading: true, // ✅ NEW: Loading state
  });

  const hasTriggeredRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTaskFailRef = useRef(onTaskFail);
  const onEventReminderRef = useRef(onEventReminder);

  // ✅ OPTIMIZED: Memoized target calculation
  const targetDateTime = useMemo(() => {
    if (!targetTime || targetTime === "All day") return null;

    try {
      const [hours, minutes] = targetTime.split(":").map(Number);
      const target = new Date(date);
      target.setHours(hours, minutes, 0, 0);
      return target;
    } catch {
      return null;
    }
  }, [date, targetTime]);

  // ✅ OPTIMIZED: Single timer with better performance
  useEffect(() => {
    if (
      isCompleted ||
      isFailed ||
      !targetDateTime ||
      targetTime === "All day"
    ) {
      setTimerState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // ✅ IMPROVED: Optimized calculation function
    const updateTimer = () => {
      const now = new Date();
      const diff = targetDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        // Time's up
        const newState = {
          hours: 0,
          minutes: 0,
          seconds: 0,
          isOverdue: true,
          shouldFail: type === "task",
          isLoading: false,
        };
        setTimerState(newState);

        // ✅ TRIGGER: Callbacks only once
        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          if (type === "task" && onTaskFail) {
            setTimeout(onTaskFail, 100);
          } else if (type === "event" && onEventReminder) {
            setTimeout(onEventReminder, 100);
          }
        }
        return;
      }

      // ✅ OPTIMIZED: Simple time calculations
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimerState({
        hours,
        minutes,
        seconds,
        isOverdue: false,
        shouldFail: false,
        isLoading: false,
      });
    };

    // ✅ IMMEDIATE: Initial calculation
    updateTimer();

    // ✅ OPTIMIZED: Only create interval if needed
    if (!isCompleted && !isFailed) {
      intervalRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [targetDateTime, type, isCompleted, isFailed, isTracking]);

  // ✅ UPDATE: Callback refs
  useEffect(() => {
    onTaskFailRef.current = onTaskFail;
    onEventReminderRef.current = onEventReminder;
  }, [onTaskFail, onEventReminder]);

  // ✅ EARLY RETURNS: Handle edge cases
  if (isCompleted) {
    return (
      <div className="mission-timer completed">
        <span className="mission-display">✅ COMPLETED</span>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="mission-timer failed">
        <span className="mission-display">❌ FAILED</span>
      </div>
    );
  }

  if (!targetTime || targetTime === "All day") {
    return (
      <div className="mission-timer all-day">
        <span className="mission-display">📅 ALL DAY</span>
      </div>
    );
  }

  // ✅ LOADING SCREEN: Show while calculating
  if (timerState.isLoading) {
    return (
      <div className="mission-timer loading">
        <div className="timer-loading-spinner"></div>
        <span className="mission-display">Calculating...</span>
      </div>
    );
  }

  // ✅ OPTIMIZED: Get urgency level function
  const getUrgencyLevel = (): string => {
    if (timerState.isOverdue) return "critical";
    if (timerState.hours === 0 && timerState.minutes <= 5) return "critical";
    if (timerState.hours === 0 && timerState.minutes <= 15) return "warning";
    if (timerState.hours === 0 && timerState.minutes <= 60) return "upcoming";
    return "normal";
  };

  const urgencyLevel = getUrgencyLevel();

  return (
    <div className={`mission-timer ${urgencyLevel}`}>
      {timerState.isOverdue ? (
        <span className="mission-display overdue-text">⏰ OVERDUE</span>
      ) : (
        <div className="mission-display">
          <span className="time-value">
            {String(timerState.hours).padStart(2, "0")}
          </span>
          <span className="time-separator">:</span>
          <span className="time-value">
            {String(timerState.minutes).padStart(2, "0")}
          </span>
          <span className="time-separator">:</span>
          <span className="time-value">
            {String(timerState.seconds).padStart(2, "0")}
          </span>
        </div>
      )}
    </div>
  );
};

// ✅ TASK COMPLETION BUTTON
interface TaskCompletionButtonProps {
  task: Task;
  onComplete: (task: Task) => void;
  isProcessing: boolean;
}

const TaskCompletionButton: React.FC<TaskCompletionButtonProps> = ({
  task,
  onComplete,
  isProcessing,
}) => {
  const getButtonContent = () => {
    if (isProcessing) {
      return { text: "PROCESSING...", className: "processing" };
    }
    return { text: "COMPLETE MISSION", className: "complete" };
  };

  const { text, className } = getButtonContent();

  return (
    <button
      className={`mission-btn ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onComplete(task);
      }}
      disabled={isProcessing}
    >
      {text}
    </button>
  );
};

// ✅ EVENT TRACKING BUTTON
interface EventTrackingButtonProps {
  event: CalendarEvent;
  isTracking: boolean;
  onToggleTracking: (event: CalendarEvent) => void;
}

const EventTrackingButton: React.FC<EventTrackingButtonProps> = ({
  event,
  isTracking,
  onToggleTracking,
}) => {
  return (
    <button
      className={`mission-tracker-btn ${isTracking ? "active" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleTracking(event);
      }}
    >
      {isTracking ? "TRACKING" : "TRACK"}
    </button>
  );
};

// ✅ MAIN NOTIFICATIONS COMPONENT
const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateTask } = useData();

  // ✅ State variables
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [failedTasks, setFailedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentPopupItem, setCurrentPopupItem] = useState<
    Task | CalendarEvent | null
  >(null);

  // ✅ Persistent tracking state with localStorage
  const [trackingEvents, setTrackingEvents] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem("trackingEvents");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [processingTasks, setProcessingTasks] = useState<Set<number>>(
    new Set()
  );

  // ✅ TAB MANAGEMENT
  const query = new URLSearchParams(location.search);
  const tabFromUrl = query.get("tab");
  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl &&
      ["pending", "completed", "failed", "event", "all"].includes(tabFromUrl)
      ? tabFromUrl
      : "all"
  );

  // ✅ SAVE TRACKING STATE TO LOCALSTORAGE
  useEffect(() => {
    try {
      localStorage.setItem(
        "trackingEvents",
        JSON.stringify([...trackingEvents])
      );
    } catch (error) {
      console.error("Failed to save tracking events:", error);
    }
  }, [trackingEvents]);

  // ✅ Proper task categorization
  const fetchNotificationsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("🔔 Notifications: No user authenticated");
        setLoading(false);
        setIsReady(true);
        return;
      }

      const today = getTodayDateString();
      console.log(`🔔 Notifications: Fetching data for ${today}`);

      const [tasksData, eventsData] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today),
        window.electronAPI.db.getEvents(userId, today),
      ]);

      // ✅ Proper task categorization based on actual status
      const allTasks = tasksData || [];

      const pending = allTasks.filter(
        (task: Task) => !task.completed && !task.failed
      );

      const completed = allTasks.filter(
        (task: Task) => task.completed && !task.failed
      );

      const failed = allTasks.filter((task: Task) => task.failed);

      setPendingTasks(pending);
      setCompletedTasks(completed);
      setFailedTasks(failed);
      setTodaysEvents(eventsData || []);

      console.log(
        `✅ Notifications: Loaded ${pending.length} pending, ${
          completed.length
        } completed, ${failed.length} failed tasks, ${
          eventsData?.length || 0
        } events`
      );
    } catch (error) {
      console.error("❌ Notifications: Error fetching data:", error);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
      setIsReady(true);
    }
  }, []);

  // ✅ REFRESH HANDLERS
  useEffect(() => {
    fetchNotificationsData();
  }, [fetchNotificationsData]);

  useEffect(() => {
    const handleRefresh = () => fetchNotificationsData();
    window.addEventListener("notifications-refresh", handleRefresh);
    return () =>
      window.removeEventListener("notifications-refresh", handleRefresh);
  }, [fetchNotificationsData]);

  // ✅ TAB MANAGEMENT
  useEffect(() => {
    if (
      tabFromUrl &&
      ["pending", "completed", "failed", "event", "all"].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/notifications?tab=${tab}`);
  };

  // ✅ TASK HANDLERS
  const handleTaskCompletion = useCallback(
    async (task: Task) => {
      if (processingTasks.has(task.id)) return;

      setProcessingTasks((prev) => new Set(prev).add(task.id));

      try {
        await updateTask({
          ...task,
          completed: true,
          updated_at: new Date().toISOString(),
        });

        await fetchNotificationsData();
      } catch (error) {
        console.error("Error completing task:", error);
      } finally {
        setProcessingTasks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(task.id);
          return newSet;
        });
      }
    },
    [updateTask, fetchNotificationsData, processingTasks]
  );

  const handleTaskFailure = useCallback(
    async (task: Task) => {
      try {
        await updateTask({
          ...task,
          failed: true,
          updated_at: new Date().toISOString(),
        });

        await fetchNotificationsData();
      } catch (error) {
        console.error("Error failing task:", error);
      }
    },
    [updateTask, fetchNotificationsData]
  );

  // ✅ EVENT HANDLERS
  const handleToggleTracking = useCallback((event: CalendarEvent) => {
    setTrackingEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(event.id)) {
        newSet.delete(event.id);
      } else {
        newSet.add(event.id);
      }
      return newSet;
    });
  }, []);

  const handleEventTimeUp = useCallback(async (event: CalendarEvent) => {
    console.log("⏰ Event time up:", event.title);

    if (Notification.permission === "granted") {
      new Notification("Event Time!", {
        body: `Your event "${event.title}" time has arrived.`,
        icon: "/favicon.ico",
      });
    }
  }, []);

  const showPopupFor = useCallback((item: Task | CalendarEvent) => {
    setCurrentPopupItem(item);
  }, []);

  // ✅ DISPLAY DATA CALCULATION - UPDATED FOR "ALL" TAB CATEGORIES
  const displayData = useMemo(() => {
    const now = new Date();

    const getEventStatus = (event: CalendarEvent): string => {
      if (!event.event_time || event.event_time === "All day") return "active";

      try {
        const [hours, minutes] = event.event_time.split(":").map(Number);
        const eventDateTime = new Date(event.event_date);
        eventDateTime.setHours(hours, minutes, 0, 0);

        return eventDateTime <= now ? "over" : "active";
      } catch {
        return "active";
      }
    };

    switch (activeTab) {
      case "pending":
        return pendingTasks.map((task) => ({
          ...task,
          itemType: "task" as const,
        }));

      case "completed":
        return completedTasks.map((task) => ({
          ...task,
          itemType: "task" as const,
        }));

      case "failed":
        return failedTasks.map((task) => ({
          ...task,
          itemType: "task" as const,
        }));

      case "event":
        const activeEvents = todaysEvents
          .filter((event) => getEventStatus(event) === "active")
          .map((event) => ({
            ...event,
            itemType: "event" as const,
            status: "active",
          }));

        const overEvents = todaysEvents
          .filter((event) => getEventStatus(event) === "over")
          .map((event) => ({
            ...event,
            itemType: "event" as const,
            status: "over",
          }));

        return [...activeEvents, ...overEvents];

      case "all":
        // ✅ NEW: Priority-based categorization for "all" tab
        const priorityCategories = {
          // 🔥 TOP PRIORITY: Pending tasks and upcoming events
          urgent: [
            ...(pendingTasks || []).map((task) => ({
              ...task,
              category: "pending-task",
            })),
            ...(todaysEvents || [])
              .filter((event) => getEventStatus(event) === "active")
              .map((event) => ({ ...event, category: "upcoming-event" })),
          ],

          // ✅ COMPLETED: Recently completed tasks
          completed: (completedTasks || []).map((task) => ({
            ...task,
            category: "completed-task",
          })),

          // ❌ FAILED: Failed tasks that need attention
          failed: (failedTasks || []).map((task) => ({
            ...task,
            category: "failed-task",
          })),

          // 📅 PAST EVENTS: Events that are over
          pastEvents: (todaysEvents || [])
            .filter((event) => getEventStatus(event) === "over")
            .map((event) => ({ ...event, category: "past-event" })),
        };

        return priorityCategories;

      default:
        return [];
    }
  }, [activeTab, pendingTasks, completedTasks, failedTasks, todaysEvents]);

  if (loading && !isReady) {
    return (
      <div className="mission-control-container">
        <div className="mission-loading">
          <div className="loading-spinner"></div>
          <p>Loading mission data...</p>
        </div>
      </div>
    );
  }

  // ✅ Safe calculation with fallback values
  const totalMissions =
    (pendingTasks?.length || 0) +
    (completedTasks?.length || 0) +
    (failedTasks?.length || 0) +
    (todaysEvents?.length || 0);

  return (
    <div className="mission-control-container">
      {/* Mission Control Header */}
      <div className="mission-control-header">
        <div className="mission-title-section">
          <h1 className="mission-title">Mission Control</h1>
          <div className="mission-summary">
            <span className="mission-count">
              {totalMissions} Total Missions Today
            </span>
          </div>
        </div>
      </div>

      {/* Mission Status Tabs */}
      <div className="mission-tabs">
        {[
          { key: "all", label: "All Missions", count: totalMissions },
          {
            key: "pending",
            label: "Active Tasks",
            count: pendingTasks?.length || 0,
          },
          {
            key: "completed",
            label: "Completed Tasks",
            count: completedTasks?.length || 0,
          },
          {
            key: "failed",
            label: "Failed Tasks",
            count: failedTasks?.length || 0,
          },
          { key: "event", label: "Events", count: todaysEvents?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`mission-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <span className="tab-icon">
              {tab.key === "all" && "🎯"}
              {tab.key === "pending" && "📋"}
              {tab.key === "completed" && "✅"}
              {tab.key === "failed" && "❌"}
              {tab.key === "event" && "📅"}
            </span>
            <span className="tab-text">{tab.label}</span>
            <span
              className={`mission-badge ${
                tab.key === "failed"
                  ? "failed"
                  : tab.key === "completed"
                  ? "completed"
                  : ""
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Mission Operations List */}
      <div className="mission-operations-list">
        {activeTab === "all" &&
        typeof displayData === "object" &&
        !Array.isArray(displayData) ? (
          <div className="mission-categories-grid">
            {/* 🔥 TOP PRIORITY SECTION */}
            <CategorySection
              title="Urgent Missions"
              items={(displayData as any).urgent}
              icon="🔥"
              emptyMessage="No urgent tasks or upcoming events"
              categoryType="urgent"
              showPopupFor={showPopupFor}
              handleTaskCompletion={handleTaskCompletion}
              handleToggleTracking={handleToggleTracking}
              handleTaskFailure={handleTaskFailure}
              handleEventTimeUp={handleEventTimeUp}
              trackingEvents={trackingEvents}
              processingTasks={processingTasks}
            />

            {/* ✅ COMPLETED SECTION */}
            <CategorySection
              title="Completed Tasks"
              items={(displayData as any).completed}
              icon="✅"
              emptyMessage="No completed tasks today"
              categoryType="completed"
              showPopupFor={showPopupFor}
              handleTaskCompletion={handleTaskCompletion}
              handleToggleTracking={handleToggleTracking}
              handleTaskFailure={handleTaskFailure}
              handleEventTimeUp={handleEventTimeUp}
              trackingEvents={trackingEvents}
              processingTasks={processingTasks}
            />

            {/* ❌ FAILED SECTION */}
            <CategorySection
              title="Failed Tasks"
              items={(displayData as any).failed}
              icon="❌"
              emptyMessage="No failed missions"
              categoryType="failed"
              showPopupFor={showPopupFor}
              handleTaskCompletion={handleTaskCompletion}
              handleToggleTracking={handleToggleTracking}
              handleTaskFailure={handleTaskFailure}
              handleEventTimeUp={handleEventTimeUp}
              trackingEvents={trackingEvents}
              processingTasks={processingTasks}
            />

            {/* 📋 PAST EVENTS SECTION */}
            <CategorySection
              title="Completed Events"
              items={(displayData as any).pastEvents}
              icon="📋"
              emptyMessage="No past events today"
              categoryType="pastEvents"
              showPopupFor={showPopupFor}
              handleTaskCompletion={handleTaskCompletion}
              handleToggleTracking={handleToggleTracking}
              handleTaskFailure={handleTaskFailure}
              handleEventTimeUp={handleEventTimeUp}
              trackingEvents={trackingEvents}
              processingTasks={processingTasks}
            />
          </div>
        ) : // ✅ KEEP: Original logic for other tabs UNCHANGED
        Array.isArray(displayData) && displayData.length > 0 ? (
          displayData.map((item: any) => {
            const isTask = item.itemType === "task";
            const isEvent = item.itemType === "event";
            const isEventOver = isEvent && item.status === "over";

            return (
              <div
                key={`${item.itemType}-${item.id}`}
                className={`mission-item ${
                  isTask
                    ? item.completed
                      ? "completed-mission"
                      : item.failed
                      ? "failed-mission"
                      : "active-mission"
                    : isEventOver
                    ? "event over"
                    : "event"
                }`}
                onClick={() => showPopupFor(item)}
              >
                <div className="mission-icon">
                  {isTask
                    ? item.completed
                      ? "✅"
                      : item.failed
                      ? "❌"
                      : "📋"
                    : isEventOver
                    ? "⏰"
                    : "📅"}
                </div>

                <div className="mission-content">
                  <div
                    className={`mission-objective ${
                      item.completed ? "completed" : item.failed ? "failed" : ""
                    }`}
                  >
                    {item.title}
                  </div>

                  <div className="mission-meta">
                    <span
                      className={`mission-status ${
                        isTask
                          ? item.completed
                            ? "completed"
                            : item.failed
                            ? "failed"
                            : "active"
                          : isEventOver
                          ? "over"
                          : "active"
                      }`}
                    >
                      {isTask
                        ? item.completed
                          ? "COMPLETED"
                          : item.failed
                          ? "FAILED"
                          : "PENDING"
                        : isEventOver
                        ? "EVENT OVER"
                        : "SCHEDULED"}
                    </span>

                    {item.task_time || item.event_time ? (
                      <span className="mission-deadline">
                        {item.task_time || item.event_time}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mission-controls">
                  {/* Timer for active items */}
                  {!isEventOver &&
                    (item.task_time || item.event_time) &&
                    !item.completed &&
                    !item.failed && (
                      <CountdownTimer
                        targetTime={item.task_time || item.event_time}
                        date={item.task_date || item.event_date}
                        type={isTask ? "task" : "event"}
                        isCompleted={item.completed}
                        isFailed={item.failed}
                        onTaskFail={() => handleTaskFailure(item)}
                        onEventReminder={() => handleEventTimeUp(item)}
                        isTracking={isEvent && trackingEvents.has(item.id)}
                      />
                    )}

                  {/* Task completion button */}
                  {isTask && !item.completed && !item.failed && (
                    <TaskCompletionButton
                      task={item}
                      onComplete={handleTaskCompletion}
                      isProcessing={processingTasks.has(item.id)}
                    />
                  )}

                  {/* Event tracking button - only for active events */}
                  {isEvent && !isEventOver && (
                    <EventTrackingButton
                      event={item}
                      isTracking={trackingEvents.has(item.id)}
                      onToggleTracking={handleToggleTracking}
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="mission-standby">
            <div className="mission-standby-icon">🎯</div>
            <h3>No Active Missions</h3>
            <p>All clear, commander!</p>
          </div>
        )}
      </div>

      {/* Popup */}
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
