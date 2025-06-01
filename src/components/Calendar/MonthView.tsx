import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth } from "date-fns";
import "./Calendar.css";
import "./MonthSelector.css";

/**
 * MonthView Component
 * Provides a year overview with month selector grid navigation
 * Allows quick navigation to specific months in week view
 * Optimized for both desktop and mobile interactions
 */
const MonthView: React.FC = () => {
  const navigate = useNavigate();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  /**
   * Month abbreviations for compact display
   * Ordered array for consistent month index mapping
   */
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

  /**
   * Handles month selection and navigation
   * Sets selected month state and navigates to week view
   * Uses first day of selected month as the target date
   */
  const handleMonthClick = useCallback(
    (monthIndex: number) => {
      setSelectedMonth(monthIndex);
      const firstDayOfMonth = startOfMonth(new Date(currentYear, monthIndex));
      const formattedDate = format(firstDayOfMonth, "yyyy-MM-dd");
      navigate(`/calendar/week?date=${formattedDate}`);
    },
    [navigate, currentYear]
  );

  /**
   * Navigates to current week view
   * Uses today's date as the target for immediate context   */

  return (
    <div className="month-view-container">      {/* Header with year display and navigation options */}
      <div className="month-view-header">
        <button
          className="month-nav-btn"
          onClick={() => setCurrentYear(currentYear - 1)}
          aria-label="Previous Year"
        >
          &lt;
        </button>
        <h1 className="month-view-title">{currentYear}</h1>
        <button
          className="month-nav-btn"
          onClick={() => setCurrentYear(currentYear + 1)}
          aria-label="Next Year"
        >
          &gt;
        </button>
      </div>

      {/* Interactive month selector grid */}
      <div className="ms-panel" role="grid" aria-label="Month Selector">
        {months.map((month, index) => (
          <button
            key={month}
            className={`ms-btn ${selectedMonth === index ? "active" : ""}`}
            onClick={() => handleMonthClick(index)}
            aria-label={`Navigate to ${month} ${currentYear}`}
            aria-pressed={selectedMonth === index}
          >
            {month}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MonthView;
