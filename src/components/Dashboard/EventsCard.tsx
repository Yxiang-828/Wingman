import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { CalendarEvent } from "../../api/Calendar";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import { VirtualizedEventList } from "../Calendar/VirtualizedList";
import "./Dashboard.css";
import "./EventsCard.css";

interface EventsCardProps {
  events: CalendarEvent[];
}

const EventsCard: React.FC<EventsCardProps> = ({ events }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  const handleEventClick = useCallback((event: CalendarEvent) => {
    showPopupFor(event);
  }, [showPopupFor]);

  const handleDeleteEvent = useCallback(async (event: CalendarEvent) => {
    // Implementation for delete if needed
    console.log("Delete event:", event.id);
  }, []);

  return (
    <div className="dashboard-card events-card">
      <div className="dashboard-card-header">
        <h2>Today's Events ({events.length})</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar/day")}
        >
          View All
        </button>
      </div>

      {events.length > 0 ? (
        <div className="events-virtualized-container">
          <VirtualizedEventList
            events={events}
            onEventClick={handleEventClick}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>
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