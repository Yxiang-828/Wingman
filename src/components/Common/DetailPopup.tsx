import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import { useData } from "../../context/DataContext";
import Portal from "./Portal";
import RetryMissionPopup from "./RetryMissionPopup";
import { getTodayDateString } from "../../utils/timeUtils";
import "./DetailPopup.css";

interface DetailPopupProps {
  item: Task | CalendarEvent;
  onClose: () => void;
  container?: HTMLElement;
}

// ✅ MEMOIZED: Prevent unnecessary re-renders
const DetailPopup: React.FC<DetailPopupProps> = React.memo(({
  item,
  onClose,
  container,
}) => {
  const navigate = useNavigate();
  const { updateTask } = useData();
  const [showRetryPopup, setShowRetryPopup] = useState(false);

  // ✅ MEMOIZED: Calculate once
  const isTask = useMemo(() => "task_date" in item && "completed" in item, [item]);
  
  // ✅ MEMOIZED: Format date once
  const formattedDate = useMemo(() => {
    const date = isTask ? item.task_date : (item as CalendarEvent).event_date;
    return format(new Date(date), "MMM d, yyyy");
  }, [item, isTask]);

  // ✅ OPTIMIZED: Use useCallback for event handlers
  const viewInCalendar = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const type = isTask ? "task" : "event";
    const date = isTask ? item.task_date : (item as CalendarEvent).event_date;
    navigate(`/calendar/day?date=${date}&highlight=${type}-${item.id}`);
    onClose();
  }, [isTask, item, navigate, onClose]);

  const handleRetryMission = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isTask) return;
    setShowRetryPopup(true);
  }, [isTask]);

  // ✅ OPTIMIZED: Memoized retry handler
  const handleRetryConfirm = useCallback(async (newTime: string) => {
    if (!isTask) return;

    try {
      console.log(`🔄 Retrying mission ${item.id} with new time: ${newTime}`);

      await updateTask({
        ...(item as Task),
        task_time: newTime,
        task_date: getTodayDateString(),
        failed: false,
        completed: false,
        updated_at: new Date().toISOString(),
      });

      console.log(`✅ Mission ${item.id} rescheduled successfully`);

      setShowRetryPopup(false);
      onClose();

      // Dispatch refresh events
      window.dispatchEvent(new CustomEvent("dashboard-refresh"));
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
    } catch (error) {
      console.error("❌ Error retrying mission:", error);
      throw error;
    }
  }, [isTask, item, updateTask, onClose]);

  // ✅ OPTIMIZED: Close retry popup handler
  const closeRetryPopup = useCallback(() => {
    setShowRetryPopup(false);
  }, []);

  // ✅ OPTIMIZED: Overlay click handler
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handlePopupClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Portal container={container || document.body}>
      <div className="detail-popup-overlay" onClick={handleOverlayClick}>
        <div className="detail-popup" onClick={handlePopupClick}>
          <button className="detail-popup-close" onClick={onClose}>
            ×
          </button>

          {isTask ? (
            <>
              <h2 className="detail-popup-title">Task Details</h2>
              <div className="detail-popup-content">
                <div className="detail-popup-header">
                  <div
                    className={`detail-status ${
                      (item as Task).completed
                        ? "completed"
                        : (item as Task).failed
                        ? "failed"
                        : ""
                    }`}
                  >
                    {(item as Task).completed
                      ? "✅ Completed"
                      : (item as Task).failed
                      ? "❌ Failed"
                      : "⏳ Pending"}
                  </div>
                  <div className="detail-date">{formattedDate}</div>
                </div>

                <div className="detail-text">{item.title}</div>

                {(item as Task).task_time && (
                  <div className="detail-time">{(item as Task).task_time}</div>
                )}

                {isTask && (item as Task).failed && (
                  <div className="detail-failed-info">
                    <span className="failed-icon">⚠️</span>
                    <span>
                      Mission failed - time has passed. Reschedule for later today.
                    </span>
                  </div>
                )}

                <div className="detail-popup-actions">
                  <button
                    className="detail-action-btn view"
                    onClick={viewInCalendar}
                  >
                    View in Calendar
                  </button>

                  {isTask && (item as Task).failed && (
                    <button
                      className="detail-action-btn retry"
                      onClick={handleRetryMission}
                    >
                      🔄 Retry Mission
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            // ... Event content (same optimization pattern)
            <>
              <h2 className="detail-popup-title">Event Details</h2>
              <div className="detail-popup-content">
                <div className="detail-popup-header">
                  <div className={`detail-type ${(item as CalendarEvent).type}`}>
                    {(item as CalendarEvent).type}
                  </div>
                  <div className="detail-date">{formattedDate}</div>
                </div>

                <div className="detail-text">{item.title}</div>

                {(item as CalendarEvent).event_time && (
                  <div className="detail-time">
                    {(item as CalendarEvent).event_time}
                  </div>
                )}

                {(item as CalendarEvent).description && (
                  <div className="detail-description">
                    {(item as CalendarEvent).description}
                  </div>
                )}

                <div className="detail-popup-actions">
                  <button
                    className="detail-action-btn view"
                    onClick={viewInCalendar}
                  >
                    View in Calendar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showRetryPopup && isTask && (
        <RetryMissionPopup
          task={item as Task}
          onClose={closeRetryPopup}
          onRetry={handleRetryConfirm}
          container={container}
        />
      )}
    </Portal>
  );
});

DetailPopup.displayName = 'DetailPopup';

export default DetailPopup;
