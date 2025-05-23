import React, { Component, useEffect } from "react";
import type { ErrorInfo } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
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

// Create a wrapper that handles the WeekView transition
const WeekViewWrapper = () => {
  // useEffect to adjust main container transitions
  useEffect(() => {
    // Add transition class to main content for smooth animations
    const mainContent = document.querySelector('.main-content-wrapper');
    if (mainContent) {
      mainContent.classList.add('week-view-transition');
    }
    
    return () => {
      // Clean up when exiting
      if (mainContent) {
        mainContent.classList.remove('week-view-transition');
      }
    };
  }, []);
  
  return <WeekView />;
};

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
  const dateParam = query.get("date") || "";
  const dateSuffix = dateParam ? `?date=${dateParam}` : "";

  return (
    <ErrorBoundary>
      <div className={`calendar-container view-${currentView}`}>
        <div className="calendar-header">
          <h1>Calendar</h1>
          <div className="calendar-view-toggle">
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
            <Route path="week" element={<WeekViewWrapper />} />
            <Route path="month" element={<MonthView />} />
            <Route path="*" element={<DayView />} />
          </Routes>
        </div>
        <EventModal />
      </div>
    </ErrorBoundary>
  );
};

export default Calendar;
