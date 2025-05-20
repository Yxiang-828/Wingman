import React from "react";
import { useNavigate } from "react-router-dom";
import type { CalendarEvent } from "../../api/Calendar";
import "./Dashboard.css";

interface EventsCardProps {
  events: CalendarEvent[];
}

const EventsCard: React.FC<EventsCardProps> = ({ events }) => {
  const navigate = useNavigate();

  const getEventIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return "📅";
      case "personal":
        return "👤";
      case "reminder":
        return "🔔";
      default:
        return "📌";
    }
  };

  return (
    <div className="dashboard-card events-card">
      <div className="dashboard-card-header">
        <h2>Upcoming Events</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar/day")}
        >
          View All
        </button>
      </div>
      {events.length > 0 ? (
        <ul className="events-list">
          {events.map((event) => (
            <li key={event.id} className={`event-item event-${event.type}`}>
              <div className="event-time">{event.time}</div>
              <div className="event-title">{event.title}</div>
              <div className="event-badge">{getEventIcon(event.type)}</div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <p>No events scheduled for today</p>
          <button
            className="action-btn small"
            onClick={() => navigate("/calendar/day")}
          >
            Add Event
          </button>
        </div>
      )}
    </div>
  );
};

export default EventsCard;
