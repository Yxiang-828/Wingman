import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import Portal from "./Portal";
import "./DetailPopup.css";
import { format } from "date-fns";

interface DetailPopupProps {
  item: Task | CalendarEvent;
  onClose: () => void;
  onComplete?: (taskId: number) => Promise<void>;
  container?: HTMLElement;
}

// Function to check if an object is a Task
const isTask = (item: Task | CalendarEvent): item is Task => {
  return "text" in item && "completed" in item;
};

// Helper to format dates consistently
const formatDateDisplay = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return format(date, "MMM d, yyyy");
  } catch (e) {
    return dateStr;
  }
};

const DetailPopup: React.FC<DetailPopupProps> = ({
  item,
  onClose,
  onComplete,
  container,
}) => {
  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle complete task function call
  const handleCompleteTask = async (e: React.MouseEvent) => {
    // Stop event propagation to prevent the overlay click from firing
    e.stopPropagation();
    e.preventDefault();

    if (isTask(item) && onComplete) {
      try {
        await onComplete(item.id);
      } catch (error) {
        console.error("Error completing task:", error);
      }
    }
  };

  // Navigate to day view with this item highlighted
  const navigateToItem = (e: React.MouseEvent) => {
    // Stop event propagation to prevent the overlay click from firing
    e.stopPropagation();

    const type = isTask(item) ? "task" : "event";
    navigate(`/calendar/day?date=${item.date}&highlight=${type}-${item.id}`);
    onClose();
  };

  const popupContent = (
    <div className="detail-popup-overlay" onClick={onClose}>
      <div
        ref={popupRef}
        className="detail-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="detail-popup-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {isTask(item) ? (
          // Task details
          <>
            <h2 className="detail-popup-title">Task Details</h2>
            <div className="detail-popup-content">
              <div className="detail-popup-header">
                <div
                  className={`detail-status ${
                    item.completed ? "completed" : ""
                  }`}
                >
                  {item.completed ? "Completed" : "Pending"}
                </div>
                <div className="detail-date">
                  {formatDateDisplay(item.date)}
                </div>
              </div>

              <div className="detail-text">{item.text}</div>

              {item.time && <div className="detail-time">{item.time}</div>}

              <div className="detail-popup-actions">
                {!item.completed && onComplete && (
                  <button
                    className="detail-action-btn complete"
                    onClick={handleCompleteTask}
                  >
                    Mark Complete
                  </button>
                )}
                <button
                  className="detail-action-btn view"
                  onClick={navigateToItem}
                >
                  View in Calendar
                </button>
              </div>
            </div>
          </>
        ) : (
          // Event details
          <>
            <h2 className="detail-popup-title">Event Details</h2>
            <div className="detail-popup-content">
              <div className="detail-popup-header">
                <div className={`detail-type ${(item as CalendarEvent).type}`}>
                  {(item as CalendarEvent).type}
                </div>
                <div className="detail-date">
                  {formatDateDisplay(item.date)}
                </div>
              </div>

              <div className="detail-text">{(item as CalendarEvent).title}</div>

              {item.time && (
                <div className="detail-time">Time: {item.time}</div>
              )}

              {(item as CalendarEvent).description && (
                <div className="detail-description">
                  {(item as CalendarEvent).description}
                </div>
              )}

              <div className="detail-popup-actions">
                <button
                  className="detail-action-btn view"
                  onClick={navigateToItem}
                >
                  View in Calendar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Add this to DetailPopup.tsx to enhance the popup when in notifications mode
  useEffect(() => {
    const isNotificationsMode =
      document.body.classList.contains("notifications-mode");

    if (isNotificationsMode && popupRef.current) {
      popupRef.current.classList.add("notifications-popup");
    }

    return () => {
      if (popupRef.current) {
        popupRef.current.classList.remove("notifications-popup");
      }
    };
  }, []);

  // Render using Portal with container properly passed
  return <Portal container={container || document.body}>{popupContent}</Portal>;
};

export default DetailPopup;
