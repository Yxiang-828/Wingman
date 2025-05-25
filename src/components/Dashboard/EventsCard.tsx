import React from "react";
import { useNavigate } from "react-router-dom";
import type { CalendarEvent } from "../../api/Calendar";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";

interface EventsCardProps {
  events: CalendarEvent[]; // Today's events only
}

const EventsCard: React.FC<EventsCardProps> = ({ events }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  const handleEventClick = (event: CalendarEvent) => {
    showPopupFor(event);
  };

  return (
    <div className="dashboard-card events-card">
      <div className="dashboard-card-header">
        <h2>Today's Events</h2>
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
            <li
              key={`event-${event.id}`}
              className={`event-item ${event.type.toLowerCase()}`}
              onClick={() => handleEventClick(event)}
            >
              <div className={`event-type ${event.type.toLowerCase()}`}>
                {event.type}
              </div>
              <div className="event-details">
                <div className="event-title">{event.title}</div>
                <div className="event-meta">
                  {event.time && (
                    <span className="event-time">{event.time}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <p>No events for today</p>
          <button
            className="action-btn small"
            onClick={() => navigate("/calendar/day")}
          >
            Add Event
          </button>
        </div>
      )}

      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          container={document.body}
        />
      )}
    </div>
  );
};

export default EventsCard;