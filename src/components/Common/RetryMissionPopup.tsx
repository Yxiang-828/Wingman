import React, { useState, useCallback, useMemo } from 'react';
import type { Task } from '../../api/Task';
import Portal from './Portal';
import { getCurrentTimeString } from '../../utils/timeUtils';
import './RetryMissionPopup.css';
import TimeInput from "../Calendar/TimeInput"; // ✅ ADD: Import TimeInput

interface RetryMissionPopupProps {
  task: Task;
  onClose: () => void;
  onRetry: (newTime: string) => Promise<void>;
  container?: HTMLElement;
}

const RetryMissionPopup: React.FC<RetryMissionPopupProps> = ({
  task,
  onClose,
  onRetry,
  container,
}) => {
  const [newTime, setNewTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ✅ MEMOIZED: Prevent recalculation on every render
  const currentTime = useMemo(() => getCurrentTimeString(), []);
  
  // ✅ OPTIMIZED: Use TimeInput change handler
  const handleTimeChange = useCallback((formattedTime: string) => {
    setNewTime(formattedTime);
    setError(''); // Clear error when user types
  }, []);
  
  // ✅ OPTIMIZED: Use useCallback to prevent re-renders
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTime) {
      setError('Please select a time');
      return;
    }

    // Validate time is in the future
    if (newTime <= currentTime) {
      setError('Please select a time later than now');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onRetry(newTime);
      onClose();
    } catch (error) {
      console.error('Error retrying mission:', error);
      setError('Failed to reschedule mission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newTime, currentTime, onRetry, onClose]);

  // ✅ OPTIMIZED: Memoized click handlers
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handlePopupClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleCancelClick = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [onClose, isSubmitting]);

  // ✅ MEMOIZED: Popup content to prevent unnecessary re-renders
  const popupContent = useMemo(() => (
    <div className="retry-popup-overlay" onClick={handleOverlayClick}>
      <div className="retry-popup" onClick={handlePopupClick}>
        <button 
          className="retry-popup-close" 
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          ×
        </button>
        
        <div className="retry-popup-header">
          <h2>🔄 Retry Mission</h2>
          <p>Reschedule this failed mission for later today</p>
        </div>

        <div className="retry-popup-content">
          <div className="mission-info">
            <h3>"{task.title}"</h3>
            <p>Original time: {task.task_time || 'No time set'}</p>
            <p>Current time: {currentTime}</p>
          </div>

          <form onSubmit={handleSubmit} className="retry-form">
            <div className="retry-form-group">
              <label htmlFor="retry-time">New time (must be later than now):</label>
              {/* ✅ REPLACED: Use TimeInput component instead of HTML input */}
              <TimeInput
                value={newTime}
                onChange={handleTimeChange}
                placeholder="Enter new time (HH:MM)"
                className="retry-time-input"
              />
            </div>

            {error && (
              <div className="retry-error">
                ⚠️ {error}
              </div>
            )}

            <div className="retry-form-actions">
              <button
                type="button"
                onClick={handleCancelClick}
                className="retry-btn cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="retry-btn confirm"
                disabled={isSubmitting || !newTime}
              >
                {isSubmitting ? 'Scheduling...' : 'Retry Mission'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  ), [task.title, task.task_time, currentTime, newTime, error, isSubmitting, handleSubmit, handleTimeChange, handleOverlayClick, handlePopupClick, handleCancelClick, onClose]);

  return (
    <Portal container={container || document.body}>
      {popupContent}
    </Portal>
  );
};

export default RetryMissionPopup;