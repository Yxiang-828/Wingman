import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import type { DiaryEntry } from '../../api/Diary';
import Portal from '../Common/Portal';
import './DiaryDetailPopup.css';

interface DiaryDetailPopupProps {
  entry: DiaryEntry;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  container?: HTMLElement;
}

const DiaryDetailPopup: React.FC<DiaryDetailPopupProps> = ({ 
  entry, 
  onClose,
  onEdit,
  onDelete,
  container
}) => {
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
  
  // Get mood emoji
  const getMoodEmoji = (mood: string = 'neutral') => {
    const moods: Record<string, string> = {
      happy: "😊",
      neutral: "😐",
      sad: "😔",
      excited: "🤩",
      tired: "😴",
    };
    return moods[mood] || "😐";
  };
  
  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (e) {
      return dateStr;
    }
  };
  
  const handleEdit = () => {
    if (onEdit && entry.id) {
      onEdit(entry.id);
      onClose();
    }
  };
  
  const handleDelete = () => {
    if (onDelete && entry.id && confirm('Are you sure you want to delete this diary entry?')) {
      onDelete(entry.id);
      onClose();
    }
  };
  
  const popupContent = (
    <div className="diary-popup-overlay" onClick={onClose}>
      <div ref={popupRef} className="diary-popup" onClick={e => e.stopPropagation()}>
        <button className="diary-popup-close" onClick={onClose}>×</button>
        
        <div className="diary-popup-header">
          <span className="diary-popup-date">{formatDateDisplay(entry.date)}</span>
          {entry.mood && (
            <span className="diary-popup-mood">{getMoodEmoji(entry.mood)}</span>
          )}
        </div>
        
        <h2 className="diary-popup-title">{entry.title}</h2>
        
        <div className="diary-popup-content">
          {entry.content.split('\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        
        <div className="diary-popup-actions">
          {onEdit && (
            <button className="diary-action-btn edit" onClick={handleEdit}>
              Edit Entry
            </button>
          )}
          {onDelete && (
            <button className="diary-action-btn delete" onClick={handleDelete}>
              Delete Entry
            </button>
          )}
        </div>
      </div>
    </div>
  );
  
  // Render using Portal to avoid positioning constraints
  return <Portal container={container}>{popupContent}</Portal>;
};

export default DiaryDetailPopup;