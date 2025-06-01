import React, { useEffect, useState, useRef, useCallback } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useCalendarCache } from "../../Hooks/useCalendar";
import "./MiniCalendar.css";

// Memoize functions that don't change often
const formatDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

const MiniCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { getDayData } = useCalendarCache("MiniCalendar");
  const [currentDate] = useState(new Date());
  const [eventsMap, setEventsMap] = useState<Record<string, { tasks: number; events: number }>>({});
  const loadingRef = useRef(false);

  // OPTIMIZATION: Throttle updates
  const throttledSetEventsMap = useCallback(
    (newMap: Record<string, { tasks: number; events: number }>) => {
      requestAnimationFrame(() => {
        setEventsMap(newMap);
      });
    },
    []
  );

  // OPTIMIZATION: Only load data once per month
  useEffect(() => {
    if (loadingRef.current) return;

    const loadEventCounts = async () => {
      loadingRef.current = true;
      const newEventsMap: Record<string, { tasks: number, events: number }> = {};

      // Get current month's date range
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      try {
        // OPTIMIZATION: Batch days in chunks of 7 to reduce concurrent requests
        for (let day = 1; day <= daysInMonth; day += 7) {
          const chunk = [];

          for (let i = 0; i < 7 && day + i <= daysInMonth; i++) {
            const date = new Date(year, month, day + i);
            chunk.push(formatDateKey(date));
          }

          // Load chunk of days
          const promises = chunk.map((dateStr) =>
            getDayData(dateStr).then((dayData) => ({
              date: dateStr,
              tasks: dayData.tasks?.length || 0,
              events: dayData.events?.length || 0,
            }))
          );

          const results = await Promise.all(promises);
          results.forEach(({ date, tasks, events }) => {
            if (tasks > 0 || events > 0) {
              newEventsMap[date] = { tasks, events };
            }
          });

          // Update UI for each chunk to show progress
          throttledSetEventsMap({ ...newEventsMap });

          // Allow UI to breathe between chunks
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (error) {
        console.error("Error loading calendar data:", error);
      } finally {
        loadingRef.current = false;
      }
    };

    loadEventCounts();
  }, [currentDate, getDayData, throttledSetEventsMap]);

  const handleDayClick = useCallback(
    (date: Date) => {
      const dateStr = formatDateKey(date);
      navigate(`/calendar/day?date=${dateStr}`);
    },
    [navigate]
  );

  // OPTIMIZATION: Memoize tile class function
  const getTileClass = useCallback(
    (date: Date) => {
      const dateKey = formatDateKey(date);
      const dayData = eventsMap[dateKey];
      const hasEvent = dayData && (dayData.tasks > 0 || dayData.events > 0);
      
      const today = new Date();
      const isToday =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

      let classes = "";
      if (hasEvent) classes += " has-event";
      if (isToday) classes += " today-highlight";
      return classes.trim();
    },
    [eventsMap]
  );

  // ✅ FIXED: Smart corner positioning with proper data attributes
  const getTileContent = useCallback(
    (date: Date) => {
      const dateKey = formatDateKey(date);
      const dayData = eventsMap[dateKey];
      
      if (!dayData || (dayData.tasks === 0 && dayData.events === 0)) return null;
      
      return (
        <div className="day-indicators">
          {dayData.tasks > 0 && (
            <div className="task-indicator">
              <span 
                className="task-count"
                data-count={dayData.tasks > 99 ? '99+' : dayData.tasks.toString()}
                title={`${dayData.tasks} task${dayData.tasks > 1 ? 's' : ''}`}
              />
            </div>
          )}
          {dayData.events > 0 && (
            <div className="event-indicator">
              <span 
                className="event-count"
                data-count={dayData.events > 99 ? '99+' : dayData.events.toString()}
                title={`${dayData.events} event${dayData.events > 1 ? 's' : ''}`}
              />
            </div>
          )}
        </div>
      );
    },
    [eventsMap]
  );

  return (
    <div className="mini-calendar-container">
      <Calendar
        onClickDay={handleDayClick}
        className="react-calendar--small"
        calendarType="iso8601"
        tileClassName={({ date }) => getTileClass(date)}
        tileContent={({ date }) => getTileContent(date)}
      />
    </div>
  );
};

export default React.memo(MiniCalendar);
