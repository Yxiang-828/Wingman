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
import DetailPopup from "../Common/DetailPopup";
import WingmanAvatar from "../Common/WingmanAvatar";
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
    const navigate = useNavigate();
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
    const handleDayViewClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/calendar/day?date=${dateStr}`);
    };

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
              <span className="section-title">Tasks ({displayTasks.length})</span>
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
                  </div>
                  <div className="item-content-wrapper">
                    <div className="item-title-compact">{task.title}</div>
                    {task.task_time && (
                      <div className="item-time-compact">{task.task_time}</div>
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
              <span className="section-title">Events ({displayEvents.length})</span>
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
                      <div className="item-time-compact">{event.event_time}</div>
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
  }
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
  const { showPopupFor, currentPopupItem, closePopup, completeTask } =
    useNotifications();

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

    window.addEventListener("week-data-refresh", handleRefresh);
    return () => window.removeEventListener("week-data-refresh", handleRefresh);
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
    "MMM d, yyyy"
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
                <WingmanAvatar
                  size="small"
                  mood="neutral"
                  context="dashboard"
                  onClick={() => navigate("/profile")}
                />
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

      {/* Integrated detail popup for item interactions */}
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

export default WeekView;
