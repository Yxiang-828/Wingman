import React, { Component, useState } from "react";
import type { ErrorInfo } from "react";
import {
  Routes,
  Route,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import EventModal from "./EventModal";
import "./Calendar.css";

/**
 * Error boundary component for graceful calendar error handling
 * Catches JavaScript errors in calendar components and displays fallback UI
 * Prevents entire application crash from calendar-specific issues
 */
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state to trigger fallback UI rendering
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging and monitoring
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

/**
 * Main Calendar component with view routing and modal management
 * Handles navigation between Day, Week, and Month views
 * Manages EventModal state for creating and editing calendar events
 * Provides persistent floating navigation for quick view switching
 */
const Calendar: React.FC = () => {
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Determines current calendar view based on URL pathname
   * Provides fallback to day view for unmatched routes
   * Used for conditional styling and active state management
   */
  const getView = () => {
    if (location.pathname.includes("/calendar/month")) return "month";
    if (location.pathname.includes("/calendar/week")) return "week";
    return "day";
  };
  const currentView = getView();

  /**
   * Opens event modal for creating new events
   * Resets selected event to ensure clean creation form
   */
  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setEventModalOpen(true);
  };

  /**
   * Opens event modal for editing existing events
   * Pre-populates form with selected event data
   */
  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventModalOpen(true);
  };

  /**
   * Closes event modal and resets state
   * Ensures clean state for next modal interaction
   */
  const handleCloseModal = () => {
    setEventModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <ErrorBoundary>
      <div className={`calendar-container view-${currentView}`}>
        <div className="calendar-main">
          {/* Calendar view routing with event handler prop drilling */}
          <Routes>
            <Route
              path="/day"
              element={
                <DayView
                  onCreateEvent={handleCreateEvent}
                  onEditEvent={handleEditEvent}
                />
              }
            />
            <Route path="/week" element={<WeekView />} />
            <Route path="/month" element={<MonthView />} />
            {/* Default redirect to week view for better initial user experience */}
            <Route path="*" element={<Navigate to="week" replace />} />
          </Routes>
        </div>

        {/* Global event modal for all calendar views */}
        <EventModal
          isOpen={eventModalOpen}
          onClose={handleCloseModal}
          event={selectedEvent}
        />

        {/* Persistent floating navigation for quick view switching */}
        <div className="floating-view-selector">
          <button
            className={`view-btn day ${
              location.pathname.includes("day") ? "active" : ""
            }`}
            onClick={() => navigate("/calendar/day")}
            aria-label="Switch to Day View"
          >
            <span className="view-btn-text">Day</span>
          </button>
          <button
            className={`view-btn week ${
              location.pathname.includes("week") ? "active" : ""
            }`}
            onClick={() => navigate("/calendar/week")}
            aria-label="Switch to Week View"
          >
            <span className="view-btn-text">Week</span>
          </button>
          <button
            className={`view-btn month ${
              location.pathname.includes("month") ? "active" : ""
            }`}
            onClick={() => navigate("/calendar/month")}
            aria-label="Switch to Month View"
          >
            <span className="view-btn-text">Month</span>
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Calendar;
