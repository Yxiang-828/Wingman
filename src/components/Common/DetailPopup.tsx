import React, { useEffect, useRef } from 'react';
import type { Task } from '../../api/Task'; // Import as type
import type { CalendarEvent } from '../../api/Calendar'; // Import as type
import { format } from 'date-fns'; // For date formatting
import { useNavigate } from 'react-router-dom';
import './DetailPopup.css';

interface DetailPopupProps {
  item: Task | CalendarEvent;
  onClose: () => void;
  onComplete?: (taskId: number) => Promise<void>;
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

const DetailPopup: React.FC<DetailPopupProps> = ({ item, onClose, onComplete }) => {
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
  const navigateToItem = () => {
    const type = isTask(item) ? 'task' : 'event';
    navigate(`/calendar/day?date=${item.date}&highlight=${type}-${item.id}`);
    onClose();
  };
  
  // Complete task if applicable
  const handleCompleteTask = async () => {
    if (isTask(item) && onComplete) {
      await onComplete(item.id);
      onClose();
    }
  };
  
  return (
    <div className="detail-popup-overlay">
      <div ref={popupRef} className="detail-popup">
        <button className="detail-popup-close" onClick={onClose}>×</button>
        
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
                {!item.completed && (
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
};

export default DetailPopup;