import React, { useEffect, useState, useRef, useCallback } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { getCurrentUserId } from "../../utils/auth";
import "./MiniCalendar.css";

// ✅ REMOVED: useCalendarCache import - going direct to SQLite

// Memoize functions that don't change often
const formatDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

const MiniCalendar: React.FC = () => {
  const navigate = useNavigate();
  // ✅ REMOVED: const { getDayData } = useCalendarCache("MiniCalendar");

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

  // ✅ UPDATED: Direct SQLite count queries instead of cache loading
  useEffect(() => {
    if (loadingRef.current) return;

    const loadEventCounts = async () => {
      loadingRef.current = true;
      const newEventsMap: Record<string, number> = {};

      // Get current month's date range
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // ✅ NEW: Get user ID for SQLite queries
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("📅 MiniCalendar: No user ID, skipping count loading");
        loadingRef.current = false;
        return;
      }

      try {
        console.log(
          `📅 MiniCalendar: Loading counts for ${daysInMonth} days (direct SQLite)`
        );

        // ✅ CHANGED: Batch days in chunks of 7 for direct SQLite count queries
        for (let day = 1; day <= daysInMonth; day += 7) {
          const chunk = [];

          for (let i = 0; i < 7 && day + i <= daysInMonth; i++) {
            const date = new Date(year, month, day + i);
            chunk.push(formatDateKey(date));
          }

          // ✅ NEW: Load chunk of days with direct SQLite calls for counts only
          const promises = chunk.map(async (dateStr) => {
            try {
              // ✅ DIRECT SQLite calls - no cache layer
              const [tasks, events] = await Promise.all([
                window.electronAPI.db.getTasks(userId, dateStr),
                window.electronAPI.db.getEvents(userId, dateStr),
              ]);

              // ✅ OPTIMIZED: Calculate count without storing full data
              const totalCount = (tasks?.length || 0) + (events?.length || 0);

              return {
                date: dateStr,
                total: totalCount,
              };
            } catch (error) {
              console.error(
                `📅 MiniCalendar: Error loading counts for ${dateStr}:`,
                error
              );
              return {
                date: dateStr,
                total: 0,
              };
            }
          });

          const results = await Promise.all(promises);
          results.forEach(({ date, total }) => {
            if (total > 0) {
              newEventsMap[date] = total;
            }
          });

          // Update UI for each chunk to show progress
          throttledSetEventsMap({ ...newEventsMap });

          // Allow UI to breathe between chunks
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        console.log(
          `✅ MiniCalendar: Loaded counts for ${
            Object.keys(newEventsMap).length
          } days with data`
        );
      } catch (error) {
        console.error("📅 MiniCalendar: Error loading calendar data:", error);
      } finally {
        loadingRef.current = false;
      }
    };

    loadEventCounts();
  }, [currentDate, throttledSetEventsMap]); // ✅ REMOVED: getDayData dependency

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
      const count = eventsMap[dateKey];
      const hasItems = count && count > 0;

      const today = new Date();
      const isToday =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

      let classes = "";
      if (hasItems) classes += " has-items";
      if (isToday) classes += " today-highlight";
      return classes.trim();
    },
    [eventsMap]
  );

  // ✅ SIMPLIFIED: Single ping indicator (unchanged)
  const getTileContent = useCallback(
    (date: Date) => {
      const dateKey = formatDateKey(date);
      const count = eventsMap[dateKey];

      if (!count || count === 0) return null;

      return (
        <div className="day-ping">
          <span
            className="activity-ping"
            data-count={count > 99 ? "99+" : count.toString()}
            title={`${count} item${count > 1 ? "s" : ""}`}
          />
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
