import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDays, startOfWeek, format } from "date-fns";
import {
  formatDateToString,
  getTodayDateString,
  parseLocalDateString,
} from "../../utils/timeUtils";
import { getCurrentUserId } from "../../utils/auth";
import { useNotifications } from "../../context/NotificationsContext"; // ✅ ADD
import DetailPopup from "../Common/DetailPopup"; // ✅ ADD
import WingmanAvatar from "../Common/WingmanAvatar";
import "./WeekView.css";

// ✅ COMPACT: Week day component with 7+7 limit
interface WeekDayProps {
  date: Date;
  events: any[];
  tasks: any[];
  isToday: boolean;
  onDayClick: (dateStr: string) => void;
}

const WeekDay = React.memo(
  ({ date, events = [], tasks = [], isToday, onDayClick }: WeekDayProps) => {
    const dateStr = formatDateToString(date);
    const navigate = useNavigate();
    const { showPopupFor } = useNotifications(); // ✅ ADD

    // ✅ LIMITS: Max 12 tasks, 12 events
    const displayTasks = tasks.slice(0, 12);
    const displayEvents = events.slice(0, 12);
    const hasMoreTasks = tasks.length > 12;
    const hasMoreEvents = events.length > 12;
    const hasOverflow = hasMoreTasks || hasMoreEvents;

    // ✅ UPDATED: Show popup instead of direct navigation
    const handleTaskClick = (e: React.MouseEvent, task: any) => {
      e.stopPropagation();
      showPopupFor(task); // Show popup instead of navigate
    };

    const handleEventClick = (e: React.MouseEvent, event: any) => {
      e.stopPropagation();
      showPopupFor(event); // Show popup instead of navigate
    };

    const handleTaskComplete = async (e: React.MouseEvent, task: any) => {
      e.stopPropagation();
      try {
        await window.electronAPI.db.updateTask(task.id, {
          completed: !task.completed,
        });
        window.dispatchEvent(new CustomEvent("week-data-refresh"));
      } catch (error) {
        console.error("Error toggling task:", error);
      }
    };

    const handleDayViewClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/calendar/day?date=${dateStr}`);
    };

    return (
      <div
        className={`week-day-compact ${isToday ? "today" : ""}`}
        onClick={() => onDayClick(dateStr)}
      >
        {/* Compact header */}
        <div className="week-day-header-compact">
          <span className="week-day-name-compact">{format(date, "EEE")}</span>
          <span className="week-day-date-compact">{date.getDate()}</span>
        </div>

        {/* Compact content */}
        <div className="week-day-content-compact">
          {/* Tasks - max 12 */}
          {displayTasks.map((task) => (
            <div
              key={`task-${task.id}`}
              className={`week-item-compact task ${
                task.completed ? "completed" : ""
              }`}
              onClick={(e) => handleTaskClick(e, task)} // ✅ SHOWS POPUP
              title={task.title}
            >
              <div
                className="task-status-compact"
                onClick={(e) => handleTaskComplete(e, task)}
              >
                {task.completed ? "✓" : "○"}
              </div>
              <div className="item-title-compact">{task.title}</div>
              {task.task_time && (
                <div className="item-time-compact">{task.task_time}</div>
              )}
            </div>
          ))}

          {/* Events - max 12 */}
          {displayEvents.map((event) => (
            <div
              key={`event-${event.id}`}
              className="week-item-compact event"
              onClick={(e) => handleEventClick(e, event)} // ✅ SHOWS POPUP
              title={event.title}
            >
              <div className="item-title-compact">{event.title}</div>
              {event.event_time && (
                <div className="item-time-compact">{event.event_time}</div>
              )}
            </div>
          ))}

          {/* Overflow navigation button */}
          {hasOverflow && (
            <button
              className="day-view-more-btn"
              onClick={handleDayViewClick}
              title={`${
                hasMoreTasks ? `+${tasks.length - 12} more tasks` : ""
              } ${hasMoreEvents ? `+${events.length - 12} more events` : ""}`}
            >
              Day View ({tasks.length + events.length} total) →
            </button>
          )}

          {/* Empty state */}
          {displayTasks.length === 0 && displayEvents.length === 0 && (
            <div className="day-empty-compact">No items</div>
          )}
        </div>
      </div>
    );
  }
);

// ✅ KEEP: Rest of WeekView component unchanged
const WeekView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup, completeTask } =
    useNotifications(); // ✅ ADD

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 });
  });

  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<Record<string, any>>({});

  // Generate week dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Fetch week data
  const fetchWeekData = useCallback(async () => {
    try {
      setLoading(true);

      const userId = getCurrentUserId();
      if (!userId) {
        console.log("📅 WeekView: No user ID, skipping week data loading");
        setLoading(false);
        return;
      }

      console.log(`📅 WeekView: Loading week data (compact display)`);

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
      console.log(`✅ WeekView: Week data loaded (compact mode)`);
    } catch (error) {
      console.error("📅 WeekView: Error fetching week data:", error);
      setWeekData({});
    } finally {
      setLoading(false);
    }
  }, [weekDates]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchWeekData();
    };

    window.addEventListener("week-data-refresh", handleRefresh);
    return () => window.removeEventListener("week-data-refresh", handleRefresh);
  }, [fetchWeekData]);

  // Initialize from URL
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

  // Navigation handlers
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

  const weekDateRange = `${format(weekStart, "MMM d")} - ${format(
    addDays(weekStart, 6),
    "MMM d, yyyy"
  )}`;
  const todayStr = getTodayDateString();

  // Calculate stats
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
          <div>Loading...</div>
        </div>
      ) : (
        <>
          {/* Compact header */}
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
                {weekDateRange} • {weekStats.total} items
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

          {/* Compact grid */}
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

      {/* ✅ ADD: Detail Popup */}
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
