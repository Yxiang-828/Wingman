import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useCalendarCache } from "../../Hooks/useCalendar";
import "./MiniCalendar.css";

interface MiniCalendarProps {
  onDateSelect?: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ onDateSelect }) => {
  const navigate = useNavigate();
  const { getDayData } = useCalendarCache("MiniCalendar");
  const [currentDate] = useState(new Date());
  const [eventsMap, setEventsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadEventCounts = async () => {
      const newEventsMap: Record<string, number> = {};

      // Get current month's date range
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Load data for each day of the month
      const promises = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = format(date, "yyyy-MM-dd");
        promises.push(
          getDayData(dateStr).then((dayData) => ({
            date: dateStr,
            count: dayData.tasks.length + dayData.events.length,
          }))
        );
      }

      const results = await Promise.all(promises);
      results.forEach(({ date, count }) => {
        if (count > 0) {
          newEventsMap[date] = count;
        }
      });

      setEventsMap(newEventsMap);
    };

    loadEventCounts();
  }, [currentDate, getDayData]);

  const formatDateKey = (date: Date): string => {
    return format(date, "yyyy-MM-dd");
  };

  const handleDayClick = (date: Date) => {
    const dateStr = formatDateKey(date);
    navigate(`/calendar/day?date=${dateStr}`);

    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <div className="px-4 mb-4">
      <Calendar
        onClickDay={handleDayClick}
        className="react-calendar--small"
        // @ts-ignore
        calendarType="iso8601"
        tileClassName={({ date }) => {
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
        }}
        tileContent={({ date }) => {
          const dateKey = formatDateKey(date);
          const eventCount = eventsMap[dateKey];
          return eventCount ? (
            <div className="event-indicator">
              <span className="event-count">{eventCount}</span>
            </div>
          ) : null;
        }}
      />
    </div>
  );
};

export default MiniCalendar;
