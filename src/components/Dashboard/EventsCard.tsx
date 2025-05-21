import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { CalendarEvent } from "../../api/Calendar";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";

interface EventsCardProps {
  events: CalendarEvent[];
}

const EventsCard: React.FC<EventsCardProps> = ({ events }) => {
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  
  // Get reference to dashboard container for modal positioning
  useEffect(() => {
    dashboardRef.current = document.querySelector(".dashboard-container");
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    showPopupFor(event);
  };

  return (
    <div className="dashboard-card events-card">
      <div className="dashboard-card-header">
        <h2>Upcoming Events</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar")}
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
                  {event.time && <span className="event-time">{event.time}</span>}
                  <span className="event-date">{formatDate(event.date)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <p>No upcoming events</p>
          <button
            className="action-btn small"
            onClick={() => navigate("/calendar")}
          >
            Add Event
          </button>
        </div>
      )}
      
      {/* This is the missing part! */}
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