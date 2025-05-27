import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDays, startOfWeek, format } from "date-fns";
import { useCalendarCache } from "../../Hooks/useCalendar";
import { useNotifications } from "../../context/NotificationsContext";
import { formatDateToString, getTodayDateString, parseLocalDateString } from "../../utils/timeUtils";
import "./Calendar.css";

// Ultra-simplified day component that only shows dots/indicators
const WeekDay = React.memo(({ 
  date, 
  eventCount = 0,
  taskCount = 0,
  completedTaskCount = 0,
  isToday, 
  onDayClick
}) => {
  const dateStr = formatDateToString(date);
  const pendingTaskCount = taskCount - completedTaskCount;
  
  return (
    <div 
      className={`week-day ${isToday ? "today" : ""}`}
      onClick={() => onDayClick(dateStr)}
    >
      <div className="week-day-header">
        <span className="week-day-name">{format(date, 'EEE')}</span>
        <span className="week-day-date">{date.getDate()}</span>
      </div>
      
      {/* JUST SHOW INDICATORS - NOT ACTUAL CONTENT */}
      <div className="week-day-content">
        {eventCount > 0 && (
          <div className="day-indicators">
            <div className="event-indicator">
              <span className="indicator-dot"></span>
              <span className="indicator-count">{eventCount} events</span>
            </div>
          </div>
        )}
        
        {taskCount > 0 && (
          <div className="day-indicators">
            <div className="task-indicator">
              <span className="indicator-dot"></span>
              <span className="indicator-count">
                {taskCount} tasks ({pendingTaskCount} pending)
              </span>
            </div>
          </div>
        )}
        
        {eventCount === 0 && taskCount === 0 && (
          <div className="day-empty">No events or tasks</div>
        )}
      </div>
    </div>
  );
});

const WeekView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getWeekData } = useCalendarCache("WeekView");
  
  // We only need counts, not actual data!
  const [activeWeekId, setActiveWeekId] = useState("");
  const [dayCounts, setDayCounts] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Navigation functions
  const handlePrevWeek = useCallback(() => {
    if (!activeWeekId) return;
    const weekStart = parseLocalDateString(activeWeekId);
    const prevWeekStart = addDays(weekStart, -7);
    const prevWeekId = formatDateToString(prevWeekStart);
    navigate(`/calendar/week?date=${prevWeekId}`);
  }, [activeWeekId, navigate]);

  const handleNextWeek = useCallback(() => {
    if (!activeWeekId) return;
    const weekStart = parseLocalDateString(activeWeekId);
    const nextWeekStart = addDays(weekStart, 7);
    const nextWeekId = formatDateToString(nextWeekStart);
    navigate(`/calendar/week?date=${nextWeekId}`);
  }, [activeWeekId, navigate]);

  const handleToday = useCallback(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekId = formatDateToString(weekStart);
    navigate(`/calendar/week?date=${weekId}`);
  }, [navigate]);
  
  // Day click navigates to day view
  const handleDayClick = useCallback((dateStr) => {
    navigate(`/calendar/day?date=${dateStr}`);
  }, [navigate]);
  
  // Load only count data, not actual content
  const loadWeekData = useCallback(async (weekId) => {
    setLoading(true);
    try {
      const weekStart = parseLocalDateString(weekId);
      const dates = Array.from({ length: 7 }, (_, i) => 
        formatDateToString(addDays(weekStart, i))
      );
      
      // Get actual data BUT only extract counts from it
      const weekData = await getWeekData(dates);
      
      // Transform to just counts
      const countData = {};
      Object.entries(weekData).forEach(([date, data]) => {
        countData[date] = {
          eventCount: data.events?.length || 0,
          taskCount: data.tasks?.length || 0,
          completedTaskCount: data.tasks?.filter(t => t.completed).length || 0
        };
      });
      
      // Set only the count data
      setDayCounts(countData);
    } catch (error) {
      console.error("Error loading week data:", error);
    } finally {
      setLoading(false);
    }
  }, [getWeekData]);
  
  // Initialize from URL
  useEffect(() => {
    const initializeWeek = () => {
      try {
        const query = new URLSearchParams(location.search);
        const dateParam = query.get("date");
        
        let weekStart;
        if (dateParam) {
          weekStart = startOfWeek(parseLocalDateString(dateParam), { weekStartsOn: 1 });
        } else {
          weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        }
        
        const weekId = formatDateToString(weekStart);
        setActiveWeekId(weekId);
        loadWeekData(weekId);
      } catch (err) {
        console.error("Error initializing week:", err);
      }
    };

    initializeWeek();
  }, [location.search, loadWeekData]);
  
  // Calculate days based on active week
  const days = useMemo(() => {
    if (!activeWeekId) return [];
    try {
      const weekStart = parseLocalDateString(activeWeekId);
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } catch (e) {
      console.error("Error calculating days:", e);
      return [];
    }
  }, [activeWeekId]);
  
  // Display data
  const weekStart = days[0] || new Date();
  const weekEnd = days[6] || new Date();
  const todayStr = getTodayDateString();

  return (
    <div className="calendar-week-view">
      <div className="week-header">
        <div className="week-title-container">
          <h1 className="week-title">{format(weekStart, 'MMMM yyyy')}</h1>
          <p className="week-subtitle">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
          </p>
        </div>
        <div className="calendar-buttons">
          <button className="calendar-btn" onClick={handlePrevWeek}>Previous</button>
          <button className="calendar-btn today-btn" onClick={handleToday}>Today</button>
          <button className="calendar-btn" onClick={handleNextWeek}>Next</button>
        </div>
      </div>

      <div className="week-days-grid">
        {days.map((day) => {
          const dateStr = formatDateToString(day);
          const isToday = dateStr === todayStr;
          const dayCount = dayCounts[dateStr] || { eventCount: 0, taskCount: 0, completedTaskCount: 0 };
          
          return (
            <WeekDay
              key={dateStr}
              date={day}
              eventCount={dayCount.eventCount}
              taskCount={dayCount.taskCount}
              completedTaskCount={dayCount.completedTaskCount}
              isToday={isToday}
              onDayClick={handleDayClick}
            />
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;