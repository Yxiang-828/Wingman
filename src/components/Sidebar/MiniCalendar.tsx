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
  const [eventsMap, setEventsMap] = useState<Record<string, number>>({});
  const loadingRef = useRef(false);

  // OPTIMIZATION: Throttle updates
  const throttledSetEventsMap = useCallback(
    (newMap: Record<string, number>) => {
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
      const newEventsMap: Record<string, number> = {};

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
              count: (dayData.tasks?.length || 0) + (dayData.events?.length || 0),
            }))
          );

          const results = await Promise.all(promises);
          results.forEach(({ date, count }) => {
            if (count > 0) {
              newEventsMap[date] = count;
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
      const hasEvent = eventsMap[formatDateKey(date)] > 0;
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

  // OPTIMIZATION: Memoize tile content function
  const getTileContent = useCallback(
    (date: Date) => {
      const dateKey = formatDateKey(date);
      const eventCount = eventsMap[dateKey];
      return eventCount ? (
        <div className="event-indicator">
          <span className="event-count">{eventCount}</span>
        </div>
      ) : null;
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
