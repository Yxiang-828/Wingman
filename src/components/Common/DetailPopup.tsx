import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import { useData } from "../../context/DataContext";
import Portal from "./Portal";
import EditPopup from "./EditPopup";
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
  return "task_date" in item && "completed" in item;
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
  const { updateTask, updateEvent } = useData();
  const popupRef = useRef<HTMLDivElement>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);

  // Handle edit button click
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditPopup(true);
  };

  // Handle save from edit popup
  const handleSave = async (updatedItem: Task | CalendarEvent) => {
    try {
      if (isTask(updatedItem)) {
        await updateTask(updatedItem);
      } else {
        await updateEvent(updatedItem);
      }
      setShowEditPopup(false);
      onClose(); // Close detail popup after successful edit
    } catch (error) {
      console.error("Error updating item:", error);
      throw error; // Let EditPopup handle the error
    }
  };

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

    const type = "task_date" in item ? "task" : "event";
    const itemDate = "task_date" in item ? item.task_date : item.event_date;
    navigate(`/calendar/day?date=${itemDate}&highlight=${type}-${item.id}`);
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
                  {formatDateDisplay(item.task_date)}
                </div>
              </div>

              <div className="detail-text">{item.title}</div>

              {item.task_time && <div className="detail-time">{item.task_time}</div>}

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
                  className="detail-action-btn edit"
                  onClick={handleEdit}
                >
                  Edit Task
                </button>
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
                  {formatDateDisplay(item.event_date)}
                </div>
              </div>

              <div className="detail-text">{(item as CalendarEvent).title}</div>

              {item.event_time && (
                <div className="detail-time">Time: {item.event_time}</div>
              )}

              {(item as CalendarEvent).description && (
                <div className="detail-description">
                  {(item as CalendarEvent).description}
                </div>
              )}

              <div className="detail-popup-actions">
                <button
                  className="detail-action-btn edit"
                  onClick={handleEdit}
                >
                  Edit Event
                </button>
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

      {/* ✅ NEW: Edit Popup */}
      {showEditPopup && (
        <EditPopup
          item={item}
          onClose={() => setShowEditPopup(false)}
          onSave={handleSave}
          container={container}
        />
      )}
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
