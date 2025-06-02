import React from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import Portal from "./Portal";
import "./DetailPopup.css";
import { format } from "date-fns";
import { useData } from "../../context/DataContext";

interface DetailPopupProps {
  item: Task | CalendarEvent;
  onClose: () => void;
  container?: HTMLElement;
}

const DetailPopup: React.FC<DetailPopupProps> = ({
  item,
  onClose,
  container,
}) => {
  const navigate = useNavigate();
  const { updateTask } = useData(); // ✅ ADD: Get updateTask function
  
  // Check if item is a task
  const isTask = 'task_date' in item && 'completed' in item;
  
  // Format date for display
  const formattedDate = isTask 
    ? format(new Date(item.task_date), "MMM d, yyyy")
    : format(new Date((item as CalendarEvent).event_date), "MMM d, yyyy");
  
  // Navigate to calendar day view
  const viewInCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const type = isTask ? "task" : "event";
    const date = isTask ? item.task_date : (item as CalendarEvent).event_date;
    navigate(`/calendar/day?date=${date}&highlight=${type}-${item.id}`);
    onClose();
  };

  // ✅ ADD: Retry mission handler
  const handleRetryMission = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isTask) return;
    
    try {
      console.log("🔄 Retrying failed mission:", item);
      
      // Reset the task - clear failed status and update to today
      const updatedTask = await updateTask({
        ...item as Task,
        failed: false,
        completed: false,
        task_date: new Date().toISOString().split('T')[0], // Set to today
        updated_at: new Date().toISOString()
      });
      
      console.log("✅ Mission retry successful:", updatedTask);
      
      // Close popup and navigate to today's tasks
      onClose();
      navigate(`/calendar/day?date=${updatedTask.task_date}&highlight=task-${updatedTask.id}`);
      
      // Trigger refresh events
      window.dispatchEvent(new CustomEvent("dashboard-refresh"));
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
      
    } catch (error) {
      console.error("❌ Error retrying mission:", error);
    }
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
                  <div className={`detail-status ${
                    (item as Task).completed ? "completed" : 
                    (item as Task).failed ? "failed" : ""
                  }`}>
                    {(item as Task).completed ? "Completed" : 
                     (item as Task).failed ? "Failed" : "Pending"}
                  </div>
                  <div className="detail-date">{formattedDate}</div>
                </div>
                
                <div className="detail-text">{item.title}</div>
                
                {(item as Task).task_time && (
                  <div className="detail-time">{(item as Task).task_time}</div>
                )}
                
                {(item as Task).failed && (
                  <div className="detail-failed-info">
                    <span className="failed-icon">💥</span>
                    <span>This mission failed due to time expiration</span>
                  </div>
                )}
                
                <div className="detail-popup-actions">
                  <button
                    className="detail-action-btn view"
                    onClick={viewInCalendar}
                  >
                    View in Calendar
                  </button>
                  
                  {(item as Task).failed && (
                    <button
                      className="detail-action-btn retry"
                      onClick={handleRetryMission} // ✅ FIXED: Use actual handler
                    >
                      Retry Mission
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