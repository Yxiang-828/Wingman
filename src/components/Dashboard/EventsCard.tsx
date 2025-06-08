import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { CalendarEvent } from "../../api/Calendar";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";
import "./EventsCard.css";

interface EventsCardProps {
  events: CalendarEvent[];
}

/**
 * EventsCard Component - Your Wingman's Schedule Keeper
 * Displays today's events with smart sorting and detail popups
 * Your agenda organized and ready for action, boss
 */
const EventsCard: React.FC<EventsCardProps> = ({ events }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  /**
   * Sorts events by time priority with smart fallback
   * Timed events first, then by creation date
   */
  const displayEvents = useMemo(() => {
    return events
      .sort((a, b) => {
        if (a.event_time && b.event_time) {
          return a.event_time.localeCompare(b.event_time);
        }
        if (a.event_time && !b.event_time) return -1;
        if (!a.event_time && b.event_time) return 1;

        return (
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
        );
      })
      .slice(0, 12);
  }, [events]);

  const hasMore = events.length > 12;

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      showPopupFor(event);
    },
    [showPopupFor]
  );

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

      <div className="dashboard-card-content">
        {displayEvents.length > 0 ? (
          <>
            <div className="dashboard-list">
              {displayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`dashboard-item event ${
                    event.type?.toLowerCase() || ""
                  }`}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="item-content">
                    <div className="item-title">{event.title}</div>
                    <div className="item-meta">
                      {event.event_time && (
                        <span className="item-time">{event.event_time}</span>
                      )}
                      {event.type && (
                        <span className="item-type">{event.type}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                className="view-more-btn"
                onClick={() => navigate("/calendar/day")}
              >
                View All {events.length} Events →
              </button>
            )}
          </>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">📅</div>
            <p>No events scheduled, boss</p>
            <button
              className="action-btn"
              onClick={() => navigate("/calendar/day")}
            >
              Add Event
            </button>
          </div>
        )}
      </div>

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
