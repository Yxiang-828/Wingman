import React, { useEffect, useRef } from 'react';
import type { Task } from '../../api/Task';
import type { CalendarEvent } from '../../api/Calendar';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Portal from './Portal';
import './DetailPopup.css';

interface DetailPopupProps {
  item: Task | CalendarEvent;
  onClose: () => void;
  onComplete?: (taskId: number) => Promise<void>;
  container?: HTMLElement;
}

// Function to check if an object is a Task
const isTask = (item: Task | CalendarEvent): item is Task => {
  return 'text' in item && 'completed' in item;
};

// Helper to format dates consistently
const formatDateDisplay = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return format(date, 'MMM d, yyyy');
  } catch (e) {
    return dateStr;
  }
};

const DetailPopup: React.FC<DetailPopupProps> = ({ item, onClose, onComplete, container }) => {
  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Navigate to day view with this item highlighted
  const navigateToItem = (e: React.MouseEvent) => {
    // Stop event propagation to prevent the overlay click from firing
    e.stopPropagation();
    
    const type = isTask(item) ? 'task' : 'event';
    navigate(`/calendar/day?date=${item.date}&highlight=${type}-${item.id}`);
    onClose();
  };
  
  // Complete task if applicable
  const handleCompleteTask = async (e: React.MouseEvent) => {
    // Stop event propagation to prevent the overlay click from firing
    e.stopPropagation();
    
    if (isTask(item) && onComplete) {
      try {
        await onComplete(item.id);
        onClose();
      } catch (error) {
        console.error("Error completing task:", error);
      }
    }
  };
  
  const popupContent = (
    // Remove the onClick from the overlay div to prevent it from capturing all clicks
    <div className="detail-popup-overlay">
      {/* Add stopPropagation to the popup div to prevent clicks from bubbling up */}
      <div ref={popupRef} className="detail-popup" onClick={(e) => e.stopPropagation()}>
        <button 
          className="detail-popup-close" 
          onClick={(e) => {
            e.stopPropagation(); 
            onClose();
          }}
        >
          ×
        </button>
        
        {isTask(item) ? (
          // Task details
          <>
            <h2 className="detail-popup-title">Task Details</h2>
            <div className="detail-popup-content">
              <div className="detail-popup-header">
                <div className={`detail-status ${item.completed ? 'completed' : ''}`}>
                  {item.completed ? '✓ Completed' : '○ Pending'}
                </div>
                <div className="detail-date">{formatDateDisplay(item.date)}</div>
              </div>
              
              <div className="detail-text">{item.text}</div>
              
              {item.time && <div className="detail-time">Time: {item.time}</div>}
              
              <div className="detail-popup-actions">
                {/* Ensure buttons inside modal retain full functionality */}
                {/* Don't break React onClick handlers or context */}
                {!item.completed && onComplete && (
                  <button 
                    className="detail-action-btn complete"
                    onClick={handleCompleteTask}
                  >
                    Mark as Completed
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
                <div className="detail-date">{formatDateDisplay(item.date)}</div>
              </div>
              
              <div className="detail-text">{(item as CalendarEvent).title}</div>
              
              {item.time && <div className="detail-time">Time: {item.time}</div>}
              
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
  
  // Render using Portal
  return <Portal container={container}>{popupContent}</Portal>;
};

export default DetailPopup;