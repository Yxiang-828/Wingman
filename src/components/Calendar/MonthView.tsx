import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth } from "date-fns";
import "./Calendar.css";
import "./MonthSelector.css";

const MonthView: React.FC = () => {
  const navigate = useNavigate();
  const [currentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Navigate to week view for the selected month
  const handleMonthClick = useCallback(
    (monthIndex: number) => {
      setSelectedMonth(monthIndex);
      const firstDayOfMonth = startOfMonth(new Date(currentYear, monthIndex));
      const formattedDate = format(firstDayOfMonth, "yyyy-MM-dd");
      navigate(`/calendar/week?date=${formattedDate}`);
    },
    [navigate, currentYear]
  );

  return (
    <div className="month-view-container">
      <div className="month-view-header">
        <h1 className="month-view-title">{currentYear}</h1>
        <div className="month-view-actions">
          <button
            className="month-nav-btn"
            onClick={() => navigate("/calendar/week")}
          >
            Week View
          </button>
          <button
            className="month-nav-btn today-btn"
            onClick={() => {
              const today = new Date();
              const formattedDate = format(today, "yyyy-MM-dd");
              navigate(`/calendar/week?date=${formattedDate}`);
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* New Month Selector */}
      <div className="ms-panel">
        {months.map((month, index) => (
          <button
            key={month}
            className={`ms-btn ${selectedMonth === index ? "active" : ""}`}
            onClick={() => handleMonthClick(index)}
          >
            {month}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MonthView;
