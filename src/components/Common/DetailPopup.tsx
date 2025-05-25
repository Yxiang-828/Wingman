import React from "react";
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

const DetailPopup: React.FC<DetailPopupProps> = ({
  item,
  onClose,
  onComplete,
  container,
}) => {
  const navigate = useNavigate();
  
  // Check if item is a task
  const isTask = 'task_date' in item && 'completed' in item;
  
  // Format date for display
  const formattedDate = isTask 
    ? format(new Date(item.task_date), "MMM d, yyyy")
    : format(new Date((item as CalendarEvent).event_date), "MMM d, yyyy");
  
  // Complete task handler
  const handleCompleteTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTask && onComplete) {
      onComplete(item.id);
    }
  };
  
  // Navigate to calendar day view
  const viewInCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const type = isTask ? "task" : "event";
    const date = isTask ? item.task_date : (item as CalendarEvent).event_date;
    navigate(`/calendar/day?date=${date}&highlight=${type}-${item.id}`);
    onClose();
  };

  return (
    <Portal container={container || document.body}>
      <div className="detail-popup-overlay" onClick={onClose}>
        <div className="detail-popup" onClick={(e) => e.stopPropagation()}>
          <button className="detail-popup-close" onClick={onClose}>×</button>
          
          {isTask ? (
            <>
              <h2 className="detail-popup-title">Task Details</h2>
              <div className="detail-popup-content">
                <div className="detail-popup-header">
                  <div className={`detail-status ${(item as Task).completed ? "completed" : ""}`}>
                    {(item as Task).completed ? "Completed" : "Pending"}
                  </div>
                  <div className="detail-date">{formattedDate}</div>
                </div>
                
                <div className="detail-text">{item.title}</div>
                
                {(item as Task).task_time && (
                  <div className="detail-time">{(item as Task).task_time}</div>
                )}
                
                <div className="detail-popup-actions">
                  {!(item as Task).completed && onComplete && (
                    <button
                      className="detail-action-btn complete"
                      onClick={handleCompleteTask}
                    >
                      Mark Complete
                    </button>
                  )}
                  <button
                    className="detail-action-btn view"
                    onClick={viewInCalendar}
                  >
                    View in Calendar
                  </button>
                </div>
              </div>
            </>
          ) : (
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
                  <div className="detail-time">{(item as CalendarEvent).event_time}</div>
                )}
                
                {(item as CalendarEvent).description && (
                  <div className="detail-description">{(item as CalendarEvent).description}</div>
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
    </Portal>
  );
};

export default DetailPopup;