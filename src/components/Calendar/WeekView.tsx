import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDays, startOfWeek, format } from "date-fns";
import {
  formatDateToString,
  getTodayDateString,
  parseLocalDateString,
} from "../../utils/timeUtils";
import { getCurrentUserId } from "../../utils/auth";
import { useNotifications } from "../../context/NotificationsContext";
import { isRecurringTask } from "../../api/Task";
import DetailPopup from "../Common/DetailPopup";
import "./WeekView.css";

/**
 * WeekDay Component Props Interface
 * Defines the structure for individual day components within the week view
 */
interface WeekDayProps {
  date: Date;
  events: any[];
  tasks: any[];
  isToday: boolean;
  onDayClick: (dateStr: string) => void;
}

/**
 * WeekDay Component
 * Compact day display with item limits and overflow handling
 * Features interactive popup system for detailed item viewing
 * Limits display to 12 tasks and 12 events per day for performance
 */
const WeekDay = React.memo(
  ({ date, events = [], tasks = [], isToday, onDayClick }: WeekDayProps) => {
    const dateStr = formatDateToString(date);
    const { showPopupFor } = useNotifications();

    // Performance optimization: limit displayed items to prevent UI overflow
    const displayTasks = tasks;
    const displayEvents = events;
    //const hasMoreTasks = tasks.length > 12;
    //const hasMoreEvents = events.length > 12;
    //const hasOverflow = hasMoreTasks || hasMoreEvents;

    /**
     * Handles task click with popup display
     * Prevents event bubbling to avoid triggering day click
     */
    const handleTaskClick = (e: React.MouseEvent, task: any) => {
      e.stopPropagation();
      showPopupFor(task);
    };

    /**
     * Handles event click with popup display
     * Prevents event bubbling to avoid triggering day click
     */
    const handleEventClick = (e: React.MouseEvent, event: any) => {
      e.stopPropagation();
      showPopupFor(event);
    };
    /**
     * Navigates to detailed day view for complete item listing
     * Used when items exceed display limits
     */

    return (
      <div
        className={`week-day-compact ${isToday ? "today" : ""}`}
        onClick={() => onDayClick(dateStr)}
      >
        <div className="week-day-header-compact">
          <div className="week-day-name-compact">{format(date, "EEE")}</div>
          <div className="week-day-date-compact">{format(date, "d")}</div>
        </div>

        <div className="week-day-content-compact">
          {/* TASKS SECTION - Top half with scrolling */}
          <div className="week-day-section tasks-section">
            <div className="section-header">
              <span className="section-title">
                Tasks ({displayTasks.length})
              </span>
            </div>
            <div className="section-content tasks-content">
              {displayTasks.map((task) => (
                <div
                  key={`task-${task.id}`}
                  className={`week-item-compact task ${
                    task.completed ? "completed" : ""
                  } ${task.failed ? "failed" : ""}`}
                  onClick={(e) => handleTaskClick(e, task)}
                >
                  <div className="task-status-compact-readonly">
                    {task.failed ? "×" : task.completed ? "✓" : "○"}
                  </div>{" "}
                  <div className="item-content-wrapper">
                    <div className="item-title-compact">{task.title}</div>
                    {task.task_time && (
                      <div className="item-time-compact">{task.task_time}</div>
                    )}{" "}
                    {isRecurringTask(task) && (
                      <span
                        className="recurring-badge-compact"
                        title="Recurring task"
                      >
                        ♻️
                      </span>
                    )}
                  </div>
                  <div className="item-type-label task-label">Task</div>
                </div>
              ))}
            </div>
          </div>

          {/* EVENTS SECTION - Bottom half with scrolling */}
          <div className="week-day-section events-section">
            <div className="section-header">
              <span className="section-title">
                Events ({displayEvents.length})
              </span>
            </div>
            <div className="section-content events-content">
              {displayEvents.map((event) => (
                <div
                  key={`event-${event.id}`}
                  className={`week-item-compact event ${
                    event.type?.toLowerCase() || ""
                  }`}
                  onClick={(e) => handleEventClick(e, event)}
                >
                  <div className="item-content-wrapper">
                    <div className="item-title-compact">{event.title}</div>
                    {event.event_time && (
                      <div className="item-time-compact">
                        {event.event_time}
                      </div>
                    )}
                  </div>
                  <div className="item-type-label event-label">Event</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

/**
 * WeekView Component
 * Main week calendar component with navigation and data management
 * Provides year overview with week-by-week navigation
 * Integrates with notification system for popup interactions
 */
const WeekView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentPopupItem, closePopup } = useNotifications();

  // Week state management with Monday start configuration
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 });
  });

  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<Record<string, any>>({});

  /**
   * Generates array of 7 consecutive dates starting from week start
   * Memoized for performance to prevent unnecessary recalculations
   */
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);
  /**
   * Fetches comprehensive week data for all 7 days
   * Handles errors gracefully with fallback empty arrays
   * Optimized for compact display with performance logging
   * Auto-generates recurring tasks for the entire week
   */
  const fetchWeekData = useCallback(async () => {
    try {
      setLoading(true);

      const userId = getCurrentUserId();
      if (!userId) {
        console.log("WeekView: No user ID available, skipping data load");
        setLoading(false);
        return;
      }

      console.log("WeekView: Loading week data for compact display");

      // First, generate recurring tasks for all days in the week
      try {
        console.log("WeekView: Generating recurring tasks for the week");
        const generatePromises = weekDates.map((date) => {
          const dateStr = formatDateToString(date);
          return window.electronAPI.db.generateRecurringTasks(userId, dateStr);
        });

        await Promise.all(generatePromises);
        console.log("WeekView: Recurring tasks generated for all days");
      } catch (generateError) {
        console.error(
          "WeekView: Error generating recurring tasks:",
          generateError,
        );
        // Continue with data loading even if generation fails
      }

      const weekDataPromises = weekDates.map(async (date) => {
        const dateStr = formatDateToString(date);

        try {
          const [tasks, events] = await Promise.all([
            window.electronAPI.db.getTasks(userId, dateStr),
            window.electronAPI.db.getEvents(userId, dateStr),
          ]);

          return {
            date: dateStr,
            data: {
              tasks: tasks || [],
              events: events || [],
            },
          };
        } catch (error) {
          console.error(`Error fetching data for ${dateStr}:`, error);
          return {
            date: dateStr,
            data: { tasks: [], events: [] },
          };
        }
      });

      const weekResults = await Promise.all(weekDataPromises);
      const newWeekData: Record<string, any> = {};

      weekResults.forEach(({ date, data }) => {
        newWeekData[date] = data;
      });

      setWeekData(newWeekData);
      console.log("WeekView: Week data loaded successfully");
    } catch (error) {
      console.error("WeekView: Error fetching week data:", error);
      setWeekData({});
    } finally {
      setLoading(false);
    }
  }, [weekDates]);
  /**
   * Listens for external refresh events from other components
   * Ensures data consistency across the application
   */
  useEffect(() => {
    const handleRefresh = () => {
      fetchWeekData();
    };

    const handleTaskFailureUpdate = () => {
      console.log(
        "WeekView: Received task failure update - refreshing week data",
      );
      fetchWeekData();
    };

    const handleDashboardRefresh = () => {
      console.log(
        "WeekView: Received dashboard refresh - refreshing week data",
      );
      fetchWeekData();
    };

    window.addEventListener("week-data-refresh", handleRefresh);
    window.addEventListener("tasks-failed-update", handleTaskFailureUpdate);
    window.addEventListener("dashboard-refresh", handleDashboardRefresh);

    return () => {
      window.removeEventListener("week-data-refresh", handleRefresh);
      window.removeEventListener(
        "tasks-failed-update",
        handleTaskFailureUpdate,
      );
      window.removeEventListener("dashboard-refresh", handleDashboardRefresh);
    };
  }, [fetchWeekData]);

  /**
   * Initializes week view from URL parameters
   * Handles invalid dates gracefully with fallback to current week
   */
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const dateParam = query.get("date");

    let newWeekStart;
    if (dateParam) {
      try {
        const paramDate = parseLocalDateString(dateParam);
        newWeekStart = startOfWeek(paramDate, { weekStartsOn: 1 });
      } catch (e) {
        newWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      }
    } else {
      newWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    }

    setWeekStart(newWeekStart);
  }, [location.search]);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);
  // Listen for recurring task template changes
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout | null = null;

    const handleRecurringTaskDeleted = () => {
      console.log(
        "📅 WeekView: Recurring task template deleted, refreshing data with debounce",
      );

      // Debounce the refresh to prevent multiple simultaneous calls
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        fetchWeekData();
      }, 500); // 500ms debounce
    };

    window.addEventListener(
      "recurring-task-deleted",
      handleRecurringTaskDeleted,
    );

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      window.removeEventListener(
        "recurring-task-deleted",
        handleRecurringTaskDeleted,
      );
    };
  }, [fetchWeekData]);

  /**
   * Navigation handlers for week traversal
   * Updates URL to maintain browser history and bookmarkability
   */
  const handlePrevWeek = () => {
    const newWeekStart = addDays(weekStart, -7);
    navigate(`/calendar/week?date=${formatDateToString(newWeekStart)}`);
  };

  const handleNextWeek = () => {
    const newWeekStart = addDays(weekStart, 7);
    navigate(`/calendar/week?date=${formatDateToString(newWeekStart)}`);
  };

  const handleToday = () => {
    const today = new Date();
    const newWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    navigate(`/calendar/week?date=${formatDateToString(newWeekStart)}`);
  };

  const handleDayClick = (dateStr: string) => {
    navigate(`/calendar/day?date=${dateStr}`);
  };

  // Formatted date range for header display
  const weekDateRange = `${format(weekStart, "MMM d")} - ${format(
    addDays(weekStart, 6),
    "MMM d, yyyy",
  )}`;
  const todayStr = getTodayDateString();

  /**
   * Calculates week statistics for header summary
   * Memoized to prevent recalculation on every render
   */
  const weekStats = useMemo(() => {
    let totalTasks = 0;
    let totalEvents = 0;

    Object.values(weekData).forEach((dayData: any) => {
      totalTasks += dayData.tasks?.length || 0;
      totalEvents += dayData.events?.length || 0;
    });

    return { totalTasks, totalEvents, total: totalTasks + totalEvents };
  }, [weekData]);

  return (
    <div className="calendar-week-view-compact">
      {loading ? (
        <div className="week-view-loading">
          <div className="loading-spinner"></div>
          <div>Loading week data...</div>
        </div>
      ) : (
        <>
          {/* Compact header with avatar and summary statistics */}
          <div className="week-header-compact">
            <div className="week-title-container-compact">
              <div className="week-header-row">
                {/* <WingmanAvatar
                  size="small"
                  mood="neutral"
                  context="dashboard"
                  onClick={() => navigate("/profile")}
                /> */}
                <h2 className="week-title-compact">Week View</h2>
              </div>
              <div className="week-subtitle-compact">
                {weekDateRange} • {weekStats.total} items (unlimited)
              </div>
            </div>
            <div className="calendar-buttons-compact">
              <button className="nav-btn-compact" onClick={handlePrevWeek}>
                ‹
              </button>
              <button
                className="nav-btn-compact today-btn-compact"
                onClick={handleToday}
              >
                Today
              </button>
              <button className="nav-btn-compact" onClick={handleNextWeek}>
                ›
              </button>
            </div>
          </div>

          {/* Week grid with individual day components */}
          <div className="week-days-grid-compact">
            {weekDates.map((date) => {
              const dateStr = formatDateToString(date);
              const dayData = weekData[dateStr] || { events: [], tasks: [] };

              return (
                <WeekDay
                  key={dateStr}
                  date={date}
                  events={dayData.events || []}
                  tasks={dayData.tasks || []}
                  isToday={dateStr === todayStr}
                  onDayClick={handleDayClick}
                />
              );
            })}
          </div>
        </>
      )}
      {/* Integrated detail popup for item interactions */}{" "}
      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          container={document.body}
        />
      )}
    </div>
  );
};

export default WeekView;
