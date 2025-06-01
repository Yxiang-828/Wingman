import React, { useState, useEffect } from "react";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { CalendarEvent } from "../../api/Calendar";
import { getCurrentUserId } from "../../utils/auth";
import TimeInput from "../Common/TimeInput";
import Modal from "../Common/Modal";
import "./Calendar.css";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  defaultDate?: string;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event = null,
  defaultDate
}) => {
  const { createEvent, updateEvent, deleteEvent } = useData();
  const { showNotification } = useNotifications();

  const [formData, setFormData] = useState({
    title: '',
    event_date: defaultDate || new Date().toISOString().split('T')[0],
    event_time: '',
    type: 'Personal',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing existing event
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        event_date: event.event_date || defaultDate || new Date().toISOString().split('T')[0],
        event_time: event.event_time || '',
        type: event.type || 'Personal',
        description: event.description || ''
      });
    } else {
      // Reset form for new event
      setFormData({
        title: '',
        event_date: defaultDate || new Date().toISOString().split('T')[0],
        event_time: '',
        type: 'Personal',
        description: ''
      });
    }
    setErrors({});
  }, [event, defaultDate, isOpen]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Event date is required';
    }

    if (!formData.type) {
      newErrors.type = 'Event type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      showNotification('Please log in to create events', 'error');
      return;
    }

    setLoading(true);

    try {
      if (event?.id) {
        // Update existing event
        const updatedEvent = await updateEvent({
          ...event,
          ...formData,
          user_id: userId
        });
        
        showNotification('Event updated successfully!', 'success');
        console.log('✅ Event updated:', updatedEvent);
      } else {
        // Create new event
        const newEvent = await createEvent({
          ...formData,
          user_id: userId
        });
        
        showNotification('Event created successfully!', 'success');
        console.log('✅ Event created:', newEvent);
      }

      onClose();
    } catch (error) {
      console.error('❌ Error saving event:', error);
      showNotification(
        error instanceof Error ? error.message : 'Failed to save event',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle event deletion
  const handleDelete = async () => {
    if (!event?.id) return;

    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    setLoading(true);

    try {
      await deleteEvent(event.id);
      showNotification('Event deleted successfully!', 'success');
      console.log('✅ Event deleted:', event.id);
      onClose();
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      showNotification(
        error instanceof Error ? error.message : 'Failed to delete event',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const eventTypes = [
    'Personal',
    'Work',
    'Meeting',
    'Reminder',
    'Social',
    'Health',
    'Travel',
    'Other'
  ];

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={event ? 'Edit Event' : 'Create New Event'}
      className="event-modal"
    >
      <form onSubmit={handleSubmit} className="event-form">
        {/* Event Title */}
        <div className="form-group">
          <label htmlFor="event-title" className="form-label">
            Event Title *
          </label>
          <input
            id="event-title"
            type="text"
            className={`form-input ${errors.title ? 'error' : ''}`}
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter event title"
            disabled={loading}
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
        </div>

        {/* Event Date */}
        <div className="form-group">
          <label htmlFor="event-date" className="form-label">
            Date *
          </label>
          <input
            id="event-date"
            type="date"
            className={`form-input ${errors.event_date ? 'error' : ''}`}
            value={formData.event_date}
            onChange={(e) => handleInputChange('event_date', e.target.value)}
            disabled={loading}
          />
          {errors.event_date && <span className="error-message">{errors.event_date}</span>}
        </div>

        {/* Event Time */}
        <div className="form-group">
          <label htmlFor="event-time" className="form-label">
            Time (optional)
          </label>
          <TimeInput
            value={formData.event_time}
            onChange={(time) => handleInputChange('event_time', time)}
            placeholder="Select time (optional)"
            className={`form-input ${errors.event_time ? 'error' : ''}`}
          />
          {errors.event_time && <span className="error-message">{errors.event_time}</span>}
        </div>

        {/* Event Type */}
        <div className="form-group">
          <label htmlFor="event-type" className="form-label">
            Type *
          </label>
          <select
            id="event-type"
            className={`form-input ${errors.type ? 'error' : ''}`}
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            disabled={loading}
          >
            {eventTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.type && <span className="error-message">{errors.type}</span>}
        </div>

        {/* Event Description */}
        <div className="form-group">
          <label htmlFor="event-description" className="form-label">
            Description (optional)
          </label>
          <textarea
            id="event-description"
            className="form-textarea"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Add event details..."
            rows={3}
            disabled={loading}
          />
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <div className="form-actions-left">
            {event?.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Event'}
              </button>
            )}
          </div>

          <div className="form-actions-right">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EventModal;