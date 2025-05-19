import React from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import EventModal from "./EventModal";
import "./Calendar.css";

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current view from URL
  const getView = () => {
    if (location.pathname.includes("/calendar/month")) return "month";
    if (location.pathname.includes("/calendar/week")) return "week";
    return "day";
  };
  const currentView = getView();

  // Optional: preserve date param when switching views
  const query = new URLSearchParams(location.search);
  const dateParam = query.get("date");
  const dateSuffix = dateParam ? `?date=${dateParam}` : "";

  return (
    <div className="calendar-container">
      <div className="calendar-header flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <div className="calendar-view-toggle flex gap-2">
          <button
            className={`calendar-toggle-btn${
              currentView === "day" ? " active" : ""
            }`}
            onClick={() => navigate(`/calendar/day${dateSuffix}`)}
          >
            Day
          </button>
          <button
            className={`calendar-toggle-btn${
              currentView === "week" ? " active" : ""
            }`}
            onClick={() => navigate(`/calendar/week${dateSuffix}`)}
          >
            Week
          </button>
          <button
            className={`calendar-toggle-btn${
              currentView === "month" ? " active" : ""
            }`}
            onClick={() => navigate(`/calendar/month${dateSuffix}`)}
          >
            Month
          </button>
        </div>
      </div>
      <div className="calendar-main">
        <Routes>
          <Route path="day" element={<DayView />} />
          <Route path="week" element={<WeekView />} />
          <Route path="month" element={<MonthView />} />
          <Route path="*" element={<DayView />} />
        </Routes>
      </div>
      <EventModal />
    </div>
  );
};

export default Calendar;
