import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import { format } from "date-fns";
import "./Calendar.css";

const MonthView: React.FC = () => {
  const navigate = useNavigate();

  // Navigate to week view when a day is clicked
  const handleDateClick = useCallback(
    (date: Date) => {
      const formattedDate = format(date, "yyyy-MM-dd");
      navigate(`/calendar/week?date=${formattedDate}`);
    },
    [navigate]
  );

  return (
    <div className="month-view-container">
      <h1 className="month-view-title">Month View</h1>
      <div className="month-calendar">
        <Calendar
          onClickDay={handleDateClick}
          calendarType="iso8601"
        />
      </div>
    </div>
  );
};

export default MonthView;