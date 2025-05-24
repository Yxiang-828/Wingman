import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import DetailPopup from "../Common/DetailPopup";
import { VirtualizedEventList, VirtualizedTaskList } from "./VirtualizedList";
import "./WeekView.css";
import "./Calendar.css";
import { debounce } from "lodash";

const WeekView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    fetchWeekData,
    taskCache,
    eventCache,
    toggleTask,
    addNewTask,
    addNewEvent,
    deleteExistingTask,
    deleteExistingEvent,
    loading: isLoading,
  } = useData();

  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  // State
  const [activeWeekId, setActiveWeekId] = useState("");
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Parse date from URL and set active week
  useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const dateParam = query.get("date") || format(new Date(), "yyyy-MM-dd");

      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        const weekStart = startOfWeek(date);
        const weekId = format(weekStart, "yyyy-MM-dd");
        setActiveWeekId(weekId);
      } else {
        // Fallback to current week
        const today = new Date();
        const weekStart = startOfWeek(today);
        setActiveWeekId(format(weekStart, "yyyy-MM-dd"));
      }
    } catch (err) {
      console.error("Error setting active week:", err);
      // Fallback to current week
      const today = new Date();
      const weekStart = startOfWeek(today);
      setActiveWeekId(format(weekStart, "yyyy-MM-dd"));
    }
  }, [location.search]);

  // Add memoization for expensive calculations
  const weeklyData = useMemo(() => {
    if (!activeWeekId || !taskCache || !eventCache) return {};

    const processedData: Record<string, { tasks: Task[]; events: CalendarEvent[] }> = {};
    const weekStart = new Date(activeWeekId);

    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(weekStart, i);
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const weekId = format(startOfWeek(currentDate), "yyyy-MM-dd");

      processedData[dateStr] = {
        tasks: taskCache[weekId]?.[dateStr] || [],
        events: eventCache[weekId]?.[dateStr] || [],
      };
    }

    return processedData;
  }, [activeWeekId, taskCache, eventCache]);

  // Debounced data fetching
  const debouncedFetchWeekData = useMemo(
    () => debounce(fetchWeekData, 300),
    [fetchWeekData]
  );

  // Simplified load effect - only fetch when needed
  useEffect(() => {
    if (!activeWeekId) return;

    const loadTimeout = setTimeout(() => setLoadingTimeout(true), 5000);

    // Check if we already have this data
    const weekId = activeWeekId;
    const hasData = taskCache[weekId] && eventCache[weekId];

    if (!hasData) {
      debouncedFetchWeekData(activeWeekId);
    }

    return () => {
      clearTimeout(loadTimeout);
      setLoadingTimeout(false);
    };
  }, [activeWeekId]); // Only depend on activeWeekId

  // Generate array of dates for the week
  const getDaysOfWeek = () => {
    if (!activeWeekId) return [];

    try {
      const weekDays = [];
      const weekStart = new Date(activeWeekId);

      for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(weekStart, i));
      }

      return weekDays;
    } catch (error) {
      console.error("Error calculating days:", error);
      return [];
    }
  };

  // Navigation handlers
  const handlePrevWeek = () => {
    if (!activeWeekId) return;

    try {
      const weekStart = new Date(activeWeekId);
      const prevWeekStart = addDays(weekStart, -7);
      const prevWeekId = format(prevWeekStart, "yyyy-MM-dd");
      navigate(`/calendar/week?date=${prevWeekId}`);
    } catch (error) {
      console.error("Error navigating to previous week:", error);
    }
  };

  const handleNextWeek = () => {
    if (!activeWeekId) return;

    try {
      const weekStart = new Date(activeWeekId);
      const nextWeekStart = addDays(weekStart, 7);
      const nextWeekId = format(nextWeekStart, "yyyy-MM-dd");
      navigate(`/calendar/week?date=${nextWeekId}`);
    } catch (error) {
      console.error("Error navigating to next week:", error);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekId = format(weekStart, "yyyy-MM-dd");
    navigate(`/calendar/week?date=${weekId}`);
  };

  // Event and task handlers
  const handleTaskClick = (task: Task) => {
    if (task) {
      showPopupFor(task);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await toggleTask(task);
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      if (task && task.id) {
        await deleteExistingTask(task.id);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event) {
      showPopupFor(event);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    try {
      if (event && event.id) {
        await deleteExistingEvent(event.id);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Popup action for completing a task
  const completeTask = async (taskId: number) => {
    try {
      let taskToComplete: Task | null = null;

      Object.values(weeklyData).forEach(({ tasks }) => {
        const found = tasks.find((t) => t.id === taskId);
        if (found) taskToComplete = found;
      });

      if (taskToComplete) {
        await handleCompleteTask(taskToComplete);
      }
    } catch (error) {
      console.error("Error completing task from popup:", error);
    }
  };

  // Add task/event handlers
  const handleAddTask = (date: string) => {
    try {
      addNewTask({
        text: "New task",
        date: date,
        time: "",
        completed: false,
      });
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleAddEvent = (date: string) => {
    try {
      addNewEvent({
        title: "New event",
        date: date,
        time: "",
        type: "personal",
        description: "",
      });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const days = getDaysOfWeek();
  const weekStart = days[0] || new Date();
  const weekEnd = days[6] || new Date();

  return (
    <div className="calendar-week-view" ref={containerRef}>
      <div className="week-header">
        <div className="week-title-container">
          <h2 className="week-title">Week View</h2>
          <div className="week-subtitle">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </div>
        </div>
        <div className="header-right">
          <div className="calendar-buttons">
            <button className="calendar-btn" onClick={handlePrevWeek}>
              ←
            </button>
            <button className="calendar-btn today-btn" onClick={handleToday}>
              Today
            </button>
            <button className="calendar-btn" onClick={handleNextWeek}>
              →
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="week-view-loading">
          <div className="loading-spinner"></div>
          <p>Loading your calendar...</p>
          {loadingTimeout && (
            <p className="loading-hint">This might take a moment...</p>
          )}
        </div>
      ) : (
        <div className="week-days-grid">
          {days.map((day) => (
            <div
              key={format(day, "yyyy-MM-dd")}
              className={`week-day ${isToday(day) ? "today" : ""}`}
            >
              <div className="week-day-header">
                <div className="day-name">{format(day, "EEE")}</div>
                <div className="day-number">{format(day, "d")}</div>
              </div>

              <div className="week-day-content">
                <div className="week-section">
                  <div className="week-section-title">Events</div>
                  <div className="week-events-list">
                    {weeklyData[format(day, "yyyy-MM-dd")]?.events &&
                    weeklyData[format(day, "yyyy-MM-dd")].events.length > 0 ? (
                      <VirtualizedEventList
                        events={weeklyData[format(day, "yyyy-MM-dd")].events}
                        onEventClick={handleEventClick}
                        onDeleteEvent={handleDeleteEvent}
                      />
                    ) : (
                      <div className="week-day-empty">No events</div>
                    )}
                  </div>
                </div>

                <div className="week-section">
                  <div className="week-section-title">Tasks</div>
                  <div className="week-tasks-list">
                    {weeklyData[format(day, "yyyy-MM-dd")]?.tasks &&
                    weeklyData[format(day, "yyyy-MM-dd")].tasks.length > 0 ? (
                      <VirtualizedTaskList
                        tasks={weeklyData[format(day, "yyyy-MM-dd")].tasks}
                        onTaskClick={handleTaskClick}
                        onCompleteTask={handleCompleteTask}
                        onDeleteTask={handleDeleteTask}
                      />
                    ) : (
                      <div className="week-day-empty">No tasks</div>
                    )}
                  </div>
                </div>

                <div className="week-day-actions">
                  <button
                    className="add-task-btn"
                    onClick={() => handleAddTask(format(day, "yyyy-MM-dd"))}
                  >
                    + Task
                  </button>
                  <button
                    className="add-event-btn"
                    onClick={() => handleAddEvent(format(day, "yyyy-MM-dd"))}
                  >
                    + Event
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
