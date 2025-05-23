import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import "./MiniCalendar.css";

interface MiniCalendarProps {
  onDateSelect?: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ onDateSelect }) => {
  const navigate = useNavigate();
  const { eventCache, taskCache } = useData();
  const [currentDate] = useState(new Date());
  const [eventsMap, setEventsMap] = useState<Record<string, number>>({});

  // Generate calendar days for current month
  useEffect(() => {
    const days: Date[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Create first day of month
    const firstDay = new Date(year, month, 1);

    // Fill in days from previous month to align with week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }

    // Fill in days for current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Create a proper Record<string, number> from the days array
    const eventsRecord: Record<string, number> = {};
    days.forEach((day) => {
      const dateKey = formatDateKey(day);
      eventsRecord[dateKey] = 0; // Default value, update as needed
    });
    setEventsMap(eventsRecord);
  }, [currentDate]);

  // Count events for each day
  useEffect(() => {
    // Fix date handling in the useEffect
    const newEventsMap: Record<string, number> = {};

    // Process events
    Object.values(eventCache || {}).forEach((weekData) => {
      Object.values(weekData || {}).forEach((dayEvents) => {
        dayEvents.forEach((event) => {
          if (event.date) {
            // Convert to string safely
            const dateStr = format(new Date(String(event.date)), "yyyy-MM-dd");
            newEventsMap[dateStr] = (newEventsMap[dateStr] || 0) + 1;
          }
        });
      });
    });

    // Process tasks
    Object.values(taskCache || {}).forEach((weekData) => {
      Object.values(weekData || {}).forEach((dayTasks) => {
        dayTasks.forEach((task) => {
          if (task.date) {
            // Convert to string safely
            const dateStr = format(new Date(String(task.date)), "yyyy-MM-dd");
            newEventsMap[dateStr] = (newEventsMap[dateStr] || 0) + 1;
          }
        });
      });
    });

    setEventsMap(newEventsMap);
  }, [eventCache, taskCache]);

  const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const handleDayClick = (date: Date) => {
    const dateStr = formatDateKey(date);
    navigate(`/calendar/day?date=${dateStr}`);

    // Also call the callback if provided
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <div className="px-4 mb-4">
      <Calendar
        onClickDay={handleDayClick}
        className="react-calendar--small"
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
