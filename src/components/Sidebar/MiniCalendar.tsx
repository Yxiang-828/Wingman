// Compact calendar widget for quick date navigation and visual reference
import React, { useCallback } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import "./MiniCalendar.css";

const formatDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

const MiniCalendar: React.FC = () => {
  const navigate = useNavigate();

  // Navigate to day view when boss clicks a date
  const handleDayClick = useCallback(
    (date: Date) => {
      const dateStr = formatDateKey(date);
      navigate(`/calendar/day?date=${dateStr}`);
    },
    [navigate]
  );

  // Highlight today's date for quick reference
  const getTileClass = useCallback((date: Date) => {
    const today = new Date();
    const isToday = formatDateKey(date) === formatDateKey(today);
    return isToday ? "today-highlight" : "";
  }, []);

  return (
    <div className="mini-calendar-container">
      <Calendar
        onClickDay={handleDayClick}
        className="react-calendar--small"
        //@ts-ignore
        calendarType="iso8601"
        tileClassName={({ date }) => getTileClass(date)}
      />
    </div>
  );
};

export default React.memo(MiniCalendar);
