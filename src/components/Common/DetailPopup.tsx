import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import { useData } from "../../context/DataContext";
import { getCurrentUserId } from "../../utils/auth";
import Portal from "./Portal";
import RetryMissionPopup from "./RetryMissionPopup";
import { getTodayDateString } from "../../utils/timeUtils";
import "./DetailPopup.css";

interface DetailPopupProps {
  item: Task | CalendarEvent;
  onClose: () => void;
  container?: HTMLElement;
}

/**
 * DetailPopup Component - Your Wingman's Information Display
 * Provides detailed view of tasks and events with action capabilities
 * Features mission retry functionality for failed operations
 */
const DetailPopup: React.FC<DetailPopupProps> = React.memo(
  ({ item, onClose, container }) => {
    const navigate = useNavigate();
    const { updateTask } = useData();
    const [showRetryPopup, setShowRetryPopup] = useState(false);

    // Performance optimization: calculate item type once
    const isTask = useMemo(
      () => "task_date" in item && "completed" in item,
      [item]
    );

    // Performance optimization: format date once
    const formattedDate = useMemo(() => {
      const date = isTask ? item.task_date : (item as CalendarEvent).event_date;
      return format(new Date(date), "MMM d, yyyy");
    }, [item, isTask]);

    /**
     * Navigates to calendar view with item highlighting
     * Your Wingman provides seamless navigation between contexts
     */

    const viewInCalendar = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        const type = isTask ? "task" : "event";
        const date = isTask
          ? item.task_date
          : (item as CalendarEvent).event_date;
        const tab = isTask ? "tasks" : "events";
        navigate(
          `/calendar/day?date=${date}&tab=${tab}&highlight=${type}-${item.id}`
        );
        onClose();
      },
      [isTask, item, navigate, onClose]
    );

    /**
     * Initiates mission retry flow for failed tasks
     * Allows rescheduling with new time parameters
     */
    const handleRetryMission = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isTask) return;
        setShowRetryPopup(true);
      },
      [isTask]
    );

    /**
     * Processes mission retry with database updates and notifications
     * Your Wingman ensures all systems are refreshed after rescheduling
     */
    const handleRetryConfirm = useCallback(
      async (newTime: string) => {
        if (!isTask) return;

        try {
          console.log(
            `Wingman: Rescheduling mission ${item.id} for ${newTime}`
          );

          // Prepare task updates with proper data types
          const taskUpdates = {
            title: String(item.title || ""),
            task_date: String(getTodayDateString()),
            task_time: String(newTime),
            completed: false,
            failed: false,
            user_id: String(item.user_id || getCurrentUserId() || ""),
          };

          await updateTask({
            id: Number(item.id),
            ...taskUpdates,
          });

          console.log(`Wingman: Mission ${item.id} rescheduled successfully`);

          setShowRetryPopup(false);
          onClose();

          // Dispatch refresh events to update all relevant views
          window.dispatchEvent(new CustomEvent("retry-mission-refresh"));
          window.dispatchEvent(new CustomEvent("dashboard-refresh"));
          window.dispatchEvent(new CustomEvent("notifications-refresh"));
        } catch (error) {
          console.error("Wingman: Error rescheduling mission:", error);
          throw error;
        }
      },
      [isTask, item, updateTask, onClose]
    );

    // Optimized event handlers to prevent unnecessary re-renders
    const closeRetryPopup = useCallback(() => {
      setShowRetryPopup(false);
    }, []);

    const handleOverlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      },
      [onClose]
    );

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
                        ? "✅ Mission Complete"
                        : (item as Task).failed
                        ? "❌ Mission Failed"
                        : "⏳ Mission Pending"}
                    </div>
                    <div className="detail-date">{formattedDate}</div>
                  </div>

                  <div className="detail-text">{item.title}</div>

                  {(item as Task).task_time && (
                    <div className="detail-time">
                      {(item as Task).task_time}
                    </div>
                  )}

                  {isTask && (item as Task).failed && (
                    <div className="detail-failed-info">
                      <span className="failed-icon">⚠️</span>
                      <span>
                        Mission failed - deadline has passed. Your Wingman can
                        reschedule for later today.
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
              <>
                <h2 className="detail-popup-title">Event Details</h2>
                <div className="detail-popup-content">
                  <div className="detail-popup-header">
                    <div
                      className={`detail-type ${(item as CalendarEvent).type|| 'default'}`}
                    >
                      {(item as CalendarEvent).type || 'General'}
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
  }
);

DetailPopup.displayName = "DetailPopup";

export default DetailPopup;
