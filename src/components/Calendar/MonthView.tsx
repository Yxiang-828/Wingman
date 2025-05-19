import React from "react";
import { useNavigate } from "react-router-dom";
import "./Calendar.css";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MonthView: React.FC = () => {
  const navigate = useNavigate();
  const [year, setYear] = React.useState(new Date().getFullYear());

  return (
    <div className="calendar-months-view">
      <div className="monthview-header flex items-center justify-center gap-4 mb-4">
        <button
          className="calendar-btn calendar-nav-btn"
          onClick={() => setYear((y) => y - 1)}
        >
          &lt;
        </button>
        <h2 className="monthview-title text-center">Select a Month in {year}</h2>
        <button
          className="calendar-btn calendar-nav-btn"
          onClick={() => setYear((y) => y + 1)}
        >
          &gt;
        </button>
      </div>
      <div className="months-grid grid grid-cols-3 gap-4">
        {months.map((month, idx) => (
          <div
            key={month}
            className="calendar-btn month-cell bg-dark rounded-lg p-6 text-center cursor-pointer hover:bg-accent-primary hover:text-white transition"
            onClick={() => {
              const monthNum = idx + 1;
              const firstDay = `${year}-${monthNum
                .toString()
                .padStart(2, "0")}-01`;
              navigate(`/calendar/week?date=${firstDay}`);
              window.scrollTo(0, 0); // Scroll to top after navigation
            }}
          >
            <span className="text-lg font-semibold">{month}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthView;