import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { addDays, startOfWeek, format } from "date-fns";
import { useCalendarCache } from "../../Hooks/useCalendar";
import { formatDateToString, getTodayDateString, parseLocalDateString } from "../../utils/timeUtils";
import "./WeekView.css";

// Simplified day component that only shows titles
interface WeekDayProps {
  date: Date;
  events: any[];
  tasks: any[];
  isToday: boolean;
  onDayClick: (dateStr: string) => void;
}

const WeekDay = React.memo(({ 
  date, 
  events = [],
  tasks = [],
  isToday, 
  onDayClick
}: WeekDayProps) => {
  const dateStr = formatDateToString(date);
  
  return (
    <div 
      className={`week-day ${isToday ? "today" : ""}`}
      onClick={() => onDayClick(dateStr)}
    >
      <div className="week-day-header">
        <span className="week-day-name">{format(date, 'EEE')}</span>
        <span className="week-day-date">{date.getDate()}</span>
      </div>
      
      <div className="week-day-content">
        {events.length > 0 && (
          <div className="title-section">
            <h4 className="section-title">Events</h4>
            <ul className="title-list">
              {events.map((event, idx) => (
                <li key={`event-${idx}`} className="title-item event-title">
                  {event.title}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {tasks.length > 0 && (
          <div className="title-section">
            <h4 className="section-title">Tasks</h4>
            <ul className="title-list">
              {tasks.map((task, idx) => (
                <li key={`task-${idx}`} className={`title-item task-title ${task.completed ? 'completed' : ''}`}>
                  {task.title}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {events.length === 0 && tasks.length === 0 && (
          <div className="day-empty">No events or tasks</div>
        )}
      </div>
    </div>
  );
});

const WeekView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
  });
  
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<Record<string, any>>({});
  
  const { getWeekData } = useCalendarCache();
  
  // Generate week dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);
  
  // Fetch week data in batch
  const fetchWeekData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Batch fetch for all dates in the week
      const dates = weekDates.map(date => formatDateToString(date));
      const data = await getWeekData(dates);
      
      setWeekData(data);
    } catch (error) {
      console.error("Error fetching week data:", error);
    } finally {
      setLoading(false);
    }
  }, [weekDates, getWeekData]);
  
  // Initialize from URL
  useEffect(() => {
    const initializeWeek = () => {
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
    };
    
    initializeWeek();
  }, [location.search]);
  
  // Fetch data when week changes
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
  
  // Format week date range for display
  const weekDateRange = `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;
  const todayStr = getTodayDateString();
  
  return (
    <div className="calendar-week-view">
      {loading ? (
        <div className="week-view-loading">
          <div className="loading-spinner"></div>
          <div>Loading your week...</div>
          <div className="loading-hint">Fetching events and tasks</div>
        </div>
      ) : (
        <>
          <div className="week-header">
            <div className="week-title-container">
              <h2 className="week-title">Week View</h2>
              <div className="week-subtitle">{weekDateRange}</div>
            </div>
            <div className="calendar-buttons">
              <span className="nav-btn" onClick={handlePrevWeek}>Previous</span>
              <span className="nav-btn today-btn" onClick={handleToday}>Today</span>
              <span className="nav-btn" onClick={handleNextWeek}>Next</span>
            </div>
          </div>
          <div className="week-days-grid">
            {weekDates.map(date => {
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
    </div>
  );
};

export default WeekView;