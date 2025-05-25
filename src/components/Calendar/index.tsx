import React, { Component } from "react";
import type { ErrorInfo } from "react";
import { Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import EventModal from "./EventModal";
import "./Calendar.css";

// Error boundary component to catch errors in the calendar views
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Calendar component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong in the Calendar</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload App</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const Calendar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Add this line to define navigate

  // Determine current view from URL
  const getView = () => {
    if (location.pathname.includes("/calendar/month")) return "month";
    if (location.pathname.includes("/calendar/week")) return "week";
    return "day";
  };
  const currentView = getView();

  return (
    <ErrorBoundary>
      <div className={`calendar-container view-${currentView}`}>
        <div className="calendar-main">
          {/* Routes for different views */}
          <Routes>
            <Route path="/day" element={<DayView />} />
            <Route path="/week" element={<WeekView />} />
            <Route path="/month" element={<MonthView />} />
            {/* Default route */}
            <Route path="*" element={<Navigate to="week" replace />} />
          </Routes>
        </div>
        <EventModal />

        {/* Add the persistent floating view selector here */}
        <div className="floating-view-selector">
          <button
            className={`view-btn day ${
              location.pathname.includes("day") ? "active" : ""
            }`}
            onClick={() => navigate("/calendar/day")}
          >
            <span className="view-btn-text">Day</span>
          </button>
          <button
            className={`view-btn week ${
              location.pathname.includes("week") ? "active" : ""
            }`}
            onClick={() => navigate("/calendar/week")}
          >
            <span className="view-btn-text">Week</span>
          </button>
          <button
            className={`view-btn month ${
              location.pathname.includes("month") ? "active" : ""
            }`}
            onClick={() => navigate("/calendar/month")}
          >
            <span className="view-btn-text">Month</span>
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Calendar;
