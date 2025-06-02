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

  // ✅ KEEP: Only navigation function
  const handleDayClick = useCallback(
    (date: Date) => {
      const dateStr = formatDateKey(date);
      navigate(`/calendar/day?date=${dateStr}`);
    },
    [navigate]
  );

  // ✅ DISABLED: All tile functions - no data fetching or display
  /*
  const getTileClass = useCallback(
    (date: Date) => {
      // All tile styling commented out
      return "";
    },
    []
  );

  const getTileContent = useCallback(
    (date: Date) => {
      // All content display commented out
      return null;
    },
    []
  );
  */

  return (
    <div className="mini-calendar-container">
      <Calendar
        onClickDay={handleDayClick}
        className="react-calendar--small"
        calendarType="iso8601"
        // ✅ DISABLED: All tile functions commented out
        // tileClassName={({ date }) => getTileClass(date)}
        // tileContent={({ date }) => getTileContent(date)}
      />
    </div>
  );
};

export default React.memo(MiniCalendar);
