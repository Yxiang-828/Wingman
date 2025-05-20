import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import { isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import "./MiniCalendar.css";

interface MiniCalendarProps {
  onDateSelect?: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ onDateSelect }) => {
  const navigate = useNavigate();
  const { tasks, events } = useData();
  const [eventDates, setEventDates] = useState<
    Array<{ date: Date; count: number }>
  >([]);

  // Group events and tasks by date
  useEffect(() => {
    // Create a map to count events and tasks per date
    const dateCountMap = new Map<string, number>();

    // Add tasks to the map
    tasks.forEach((task) => {
      const dateKey = task.date;
      dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
    });

    // Add events to the map
    events.forEach((event) => {
      const dateKey = event.date;
      dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
    });

    // Convert map to array of objects with date and count
    const dates = Array.from(dateCountMap.entries()).map(
      ([dateStr, count]) => ({
        date: new Date(dateStr),
        count,
      })
    );

    setEventDates(dates);
  }, [tasks, events]);

  const handleDateClick = (date: Date) => {
    // Convert to YYYY-MM-DD format
    const dateStr = date.toISOString().split("T")[0];

    // Navigate to day view with selected date
    navigate(`/calendar/day?date=${dateStr}`);

    // Also call the callback if provided
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <div className="px-4 mb-4">
      <Calendar
        onClickDay={handleDateClick}
        className="react-calendar--small"
        tileClassName={({ date }) => {
          const hasEvent = eventDates.some((e) => isSameDay(e.date, date));
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
          const eventInfo = eventDates.find((e) => isSameDay(e.date, date));
          return eventInfo ? (
            <div className="event-indicator">
              <span className="event-count">{eventInfo.count}</span>
            </div>
          ) : null;
        }}
      />
    </div>
  );
};

export default MiniCalendar;
