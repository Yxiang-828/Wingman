import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { useCalendarCache } from "../../Hooks/useCalendar";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getCurrentUserId } from "../../utils/auth";
import { Auth } from "../../utils/AuthStateManager";

import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import DetailPopup from "../Common/DetailPopup";
import "./WeekView.css";
import "./Calendar.css";

const WeekView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const { getWeekData, loading: cacheLoading } = useCalendarCache("WeekView");
  const { createTask, createEvent, toggleTask, deleteTask, deleteEvent } =
    useData();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  const [activeWeekId, setActiveWeekId] = useState("");
  const [weeklyData, setWeeklyData] = useState<
    Record<string, { tasks: Task[]; events: CalendarEvent[] }>
  >({});
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Auth.isAuthenticated);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // ✅ NEW: Auto-fetch timer
  const autoFetchTimerRef = useRef<NodeJS.Timeout>();
  
  // ✅ FIXED: Force fetch when week changes
  const forceLoadWeekData = useCallback(async (weekId: string) => {
    if (!weekId || !isAuthenticated) return;
    
    const userId = getCurrentUserId();
    if (!userId) return;

    setLoading(true);
    try {
      console.log(`🔄 WeekView: FORCE FETCHING data for week ${weekId}`);

      const weekStart = new Date(weekId);
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        return date.toISOString().split("T")[0];
      });

      // ✅ FORCE REFRESH: Clear cache and fetch fresh data
      const weekData = await getWeekData(dates);

      const transformedData: Record<string, { tasks: Task[]; events: CalendarEvent[] }> = {};
      dates.forEach((date) => {
        transformedData[date] = weekData[date] || { tasks: [], events: [] };
      });

      setWeeklyData(transformedData);
      console.log(`✅ WeekView: Loaded fresh data for week ${weekId}`);
    } catch (error) {
      console.error(`❌ WeekView: Error loading week data:`, error);
      setWeeklyData({});
    } finally {
      setLoading(false);
    }
  }, [getWeekData, isAuthenticated]);

  // ✅ FIXED: Navigate to previous week AND FETCH DATA
  const handlePrevWeek = useCallback(() => {
    if (!activeWeekId) return;
    try {
      const weekStart = new Date(activeWeekId);
      const prevWeekStart = addDays(weekStart, -7);
      const prevWeekId = format(prevWeekStart, "yyyy-MM-dd");
      
      console.log(`📅 WeekView: Navigating to PREVIOUS week: ${prevWeekId}`);
      
      // Update URL
      navigate(`/calendar/week?date=${prevWeekId}`);
      
      // IMMEDIATELY fetch data for the new week
      setActiveWeekId(prevWeekId);
      forceLoadWeekData(prevWeekId);
    } catch (error) {
      console.error("Error navigating to previous week:", error);
    }
  }, [activeWeekId, navigate, forceLoadWeekData]);

  // ✅ FIXED: Navigate to next week AND FETCH DATA
  const handleNextWeek = useCallback(() => {
    if (!activeWeekId) return;
    try {
      const weekStart = new Date(activeWeekId);
      const nextWeekStart = addDays(weekStart, 7);
      const nextWeekId = format(nextWeekStart, "yyyy-MM-dd");
      
      console.log(`📅 WeekView: Navigating to NEXT week: ${nextWeekId}`);
      
      // Update URL
      navigate(`/calendar/week?date=${nextWeekId}`);
      
      // IMMEDIATELY fetch data for the new week
      setActiveWeekId(nextWeekId);
      forceLoadWeekData(nextWeekId);
    } catch (error) {
      console.error("Error navigating to next week:", error);
    }
  }, [activeWeekId, navigate, forceLoadWeekData]);

  // ✅ FIXED: Go to today AND FETCH DATA
  const handleToday = useCallback(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekId = format(weekStart, "yyyy-MM-dd");
    
    console.log(`📅 WeekView: Navigating to TODAY's week: ${weekId}`);
    
    navigate(`/calendar/week?date=${weekId}`);
    setActiveWeekId(weekId);
    forceLoadWeekData(weekId);
  }, [navigate, forceLoadWeekData]);

  // Initialize week ID from URL
  useEffect(() => {
    const initializeWeek = () => {
      try {
        const query = new URLSearchParams(location.search);
        const dateParam = query.get("date");

        let targetDate: Date;
        if (dateParam) {
          targetDate = new Date(dateParam);
          if (isNaN(targetDate.getTime())) {
            targetDate = new Date();
          }
        } else {
          targetDate = new Date();
        }

        const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
        const weekId = format(weekStart, "yyyy-MM-dd");

        console.log(`📅 WeekView: Initializing week: ${weekId}`);
        setActiveWeekId(weekId);
        
        // ✅ IMMEDIATELY fetch data for this week
        if (isAuthenticated) {
          forceLoadWeekData(weekId);
        }
      } catch (err) {
        console.error("Error setting active week:", err);
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekId = format(weekStart, "yyyy-MM-dd");
        setActiveWeekId(weekId);
        if (isAuthenticated) {
          forceLoadWeekData(weekId);
        }
      }
    };

    initializeWeek();
  }, [location.search, isAuthenticated, forceLoadWeekData]);

  // ✅ NEW: Auto-fetch adjacent weeks after 10 seconds
  useEffect(() => {
    if (!activeWeekId || !isAuthenticated) return;

    // Clear existing timer
    if (autoFetchTimerRef.current) {
      clearTimeout(autoFetchTimerRef.current);
    }

    // Set new timer for 10 seconds
    autoFetchTimerRef.current = setTimeout(async () => {
      console.log(`🤖 WeekView: Auto-fetching adjacent weeks for ${activeWeekId}`);
      
      try {
        const weekStart = new Date(activeWeekId);
        
        // Get previous and next week dates
        const prevWeekStart = addDays(weekStart, -7);
        const nextWeekStart = addDays(weekStart, 7);
        
        const prevWeekDates = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(prevWeekStart);
          date.setDate(date.getDate() + i);
          return date.toISOString().split("T")[0];
        });
        
        const nextWeekDates = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(nextWeekStart);
          date.setDate(date.getDate() + i);
          return date.toISOString().split("T")[0];
        });

        // Pre-fetch adjacent weeks
        await Promise.all([
          getWeekData(prevWeekDates),
          getWeekData(nextWeekDates)
        ]);
        
        console.log(`✅ WeekView: Pre-fetched adjacent weeks`);
      } catch (error) {
        console.error("Error pre-fetching adjacent weeks:", error);
      }
    }, 10000); // 10 seconds

    // Cleanup on unmount or week change
    return () => {
      if (autoFetchTimerRef.current) {
        clearTimeout(autoFetchTimerRef.current);
      }
    };
  }, [activeWeekId, isAuthenticated, getWeekData]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = Auth.addListener((isAuth) => {
      setIsAuthenticated(isAuth);
      if (isAuth && activeWeekId) {
        forceLoadWeekData(activeWeekId);
      }
    });
    return () => unsubscribe();
  }, [activeWeekId, forceLoadWeekData]);

  // Load data when ready
  useEffect(() => {
    const loadWeekData = async () => {
      console.log(
        `📅 WeekView: Load check - auth: ${isAuthenticated}, weekId: ${activeWeekId}, loading: ${loading}`
      );

      if (!isAuthenticated) {
        console.log(
          "📅 WeekView: Not authenticated, setting loaded without data"
        );
        setDataLoaded(true);
        return;
      }

      const userId = getCurrentUserId();
      if (!userId) {
        console.log(
          "📅 WeekView: No user ID available, setting loaded without data"
        );
        setDataLoaded(true);
        return;
      }

      if (!activeWeekId) {
        console.log("📅 WeekView: No activeWeekId, waiting...");
        return;
      }

      if (loading) {
        console.log("📅 WeekView: Already loading, skipping");
        return;
      }

      setLoading(true);
      try {
        console.log(
          `📅 WeekView: Loading data for week starting ${activeWeekId}`
        );

        const weekStart = new Date(activeWeekId);
        const dates = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          return date.toISOString().split("T")[0];
        });

        console.log(`📅 WeekView: Fetching data for dates:`, dates);

        const weekData = await getWeekData(dates);

        const transformedData: Record<
          string,
          { tasks: Task[]; events: CalendarEvent[] }
        > = {};

        dates.forEach((date) => {
          transformedData[date] = weekData[date] || { tasks: [], events: [] };
        });

        setWeeklyData(transformedData);
        console.log(
          `📅 WeekView: Successfully loaded data for ${dates.length} days`
        );
      } catch (error) {
        console.error(`📅 WeekView: Error loading week data:`, error);
        setWeeklyData({});
      } finally {
        setLoading(false);
        setDataLoaded(true);
      }
    };

    if (isAuthenticated && activeWeekId && !dataLoaded && !loading) {
      console.log(
        `📅 WeekView: Triggering data load - auth: ${isAuthenticated}, weekId: ${activeWeekId}`
      );
      loadWeekData();
    }
  }, [activeWeekId, isAuthenticated, getWeekData, dataLoaded, loading]);

  // ✅ DEBUG: Log loading states
  console.log("📅 WeekView Loading Debug:", {
    cacheLoading,
    loading,
    dataLoaded,
    activeWeekId,
    isAuthenticated,
  });

  // ✅ FIXED: Remove cacheLoading dependency since it's broken
  if (loading || !dataLoaded || !activeWeekId) {
    console.log("📅 WeekView STUCK because:", {
      loading: loading ? "TRUE (STUCK)" : "false",
      dataLoaded: dataLoaded ? "true" : "FALSE (STUCK)",
      activeWeekId: activeWeekId || "MISSING (STUCK)",
      // ✅ REMOVED: cacheLoading check since it never resets properly
    });
    return (
      <div className="calendar-week-view" ref={containerRef}>
        <div className="week-header">
          <div className="week-title-container">
            <h1 className="week-title">Loading week view...</h1>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
              Local: {loading ? "loading..." : "ready"} | 
              Data: {dataLoaded ? "loaded" : "loading..."} | 
              WeekID: {activeWeekId || "pending..."}
              {/* ✅ REMOVED: Cache loading indicator */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get days for the week
  function getDaysOfWeek() {
    if (!activeWeekId) return [];

    try {
      const weekDays = [];
      const weekStart = new Date(activeWeekId);

      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        weekDays.push(day);
      }

      return weekDays;
    } catch (error) {
      console.error("Error calculating days:", error);
      return [];
    }
  }

  // CRUD handlers
  const handleAddTask = async (dateStr: string) => {
    try {
      const newTaskData = {
        title: "New task",
        task_date: dateStr,
        task_time: "",
        completed: false,
      };

      const addedTask = await createTask(newTaskData);
      setWeeklyData((prev) => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          tasks: [...(prev[dateStr]?.tasks || []), addedTask],
        },
      }));
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleAddEvent = async (dateStr: string) => {
    try {
      const newEventData = {
        title: "New event",
        event_date: dateStr,
        event_time: "",
        type: "personal",
        description: "",
      };

      const addedEvent = await createEvent(newEventData);
      setWeeklyData((prev) => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          events: [...(prev[dateStr]?.events || []), addedEvent],
        },
      }));
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
          <h1 className="week-title">
            {format(weekStart, "MMMM d")} - {format(weekEnd, "MMMM d, yyyy")}
          </h1>
        </div>
        
        <div className="calendar-buttons">
          <button className="calendar-btn" onClick={handlePrevWeek}>
            ← Previous
          </button>
          <button className="calendar-btn today-btn" onClick={handleToday}>
            Today
          </button>
          <button className="calendar-btn" onClick={handleNextWeek}>
            Next →
          </button>
        </div>
      </div>

      <div className="week-days-grid">
        {days.map((day, index) => {
          const dateStr = day.toISOString().split("T")[0];
          const dayData = weeklyData[dateStr] || { tasks: [], events: [] };

          return (
            <div key={dateStr} className="week-day">
              <div className="week-day-header">
                <h3>{format(day, "EEE")}</h3>
                <span>{format(day, "d")}</span>
              </div>

              <div className="week-day-content">
                <div className="week-events">
                  {dayData.events.map((event) => (
                    <div
                      key={`event-${event.id}`}
                      className="week-event-item"
                      onClick={() => showPopupFor(event)}
                    >
                      <span className="event-time">{event.event_time}</span>
                      <span className="event-title">{event.title}</span>
                    </div>
                  ))}
                </div>

                <div className="week-tasks">
                  {dayData.tasks.map((task) => (
                    <div
                      key={`task-${task.id}`}
                      className={`week-task-item ${task.completed ? "completed" : ""}`}
                      onClick={() => showPopupFor(task)}
                    >
                      <span className="task-status">
                        {task.completed ? "✓" : "○"}
                      </span>
                      <span className="task-title">{task.title}</span>
                    </div>
                  ))}
                </div>

                <div className="week-day-actions">
                  <button
                    className="add-task-btn"
                    onClick={() => handleAddTask(dateStr)}
                  >
                    + Task
                  </button>
                  <button
                    className="add-event-btn"
                    onClick={() => handleAddEvent(dateStr)}
                  >
                    + Event
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          onComplete={async (taskId) => {
            let taskToComplete: Task | null = null;
            Object.values(weeklyData).forEach(({ tasks }) => {
              const found = tasks.find((t) => t.id === taskId);
              if (found) taskToComplete = found;
            });

            if (taskToComplete) {
              try {
                const updatedTask = await toggleTask(taskToComplete);
                setWeeklyData((prev) => {
                  const newData = { ...prev };
                  Object.keys(newData).forEach((date) => {
                    newData[date] = {
                      ...newData[date],
                      tasks: newData[date].tasks.map((t) =>
                        t.id === taskId ? updatedTask : t
                      ),
                    };
                  });
                  return newData;
                });
              } catch (error) {
                console.error("Error completing task:", error);
              }
            }
          }}
          container={document.body}
        />
      )}
    </div>
  );
};

export default WeekView;
