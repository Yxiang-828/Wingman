import React, { useState } from "react";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import Portal from "./Portal";
import TimeInput from "./TimeInput";
import "./EditPopup.css";

interface EditPopupProps {
  item: Task | CalendarEvent;
  onClose: () => void;
  onSave: (updatedItem: Task | CalendarEvent) => Promise<void>;
  container?: HTMLElement;
}

const isTask = (item: Task | CalendarEvent): item is Task => {
  return "task_date" in item && "completed" in item;
};

const EditPopup: React.FC<EditPopupProps> = ({
  item,
  onClose,
  onSave,
  container,
}) => {
  const [formData, setFormData] = useState(() => {
    if (isTask(item)) {
      return {
        title: item.title,
        task_time: item.task_time || "",
        task_date: item.task_date, // ✅ This is already a string, no issue
      };
    } else {
      return {
        title: item.title,
        event_time: item.event_time || "",
        event_date: item.event_date,
        type: item.type,
        description: item.description || "",
      };
    }
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isTask(item)) {
        // ✅ FIXED: Add type assertion for the update
        const updatedTask: Task = {
          ...item,
          title: formData.title,
          task_time: formData.task_time,
          task_date: formData.task_date as string, // ✅ Type assertion
        };
        await onSave(updatedTask);
      } else {
        const updatedEvent: CalendarEvent = {
          ...item,
          title: formData.title,
          event_time: (formData as any).event_time,
          event_date: (formData as any).event_date,
          type: (formData as any).type,
          description: (formData as any).description,
        };
        await onSave(updatedEvent);
      }
      onClose();
    } catch (error) {
      console.error("Error saving item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Portal container={container || document.body}>
      <div className="edit-popup-overlay" onClick={onClose}>
        <div className="edit-popup" onClick={(e) => e.stopPropagation()}>
          <div className="edit-popup-header">
            <h2>Edit {isTask(item) ? "Task" : "Event"}</h2>
            <button className="edit-popup-close" onClick={onClose}>×</button>
          </div>

          <form onSubmit={handleSubmit} className="edit-popup-form">
            <div className="edit-form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
                className="edit-form-input"
              />
            </div>

            <div className="edit-form-group">
              <label>Time</label>
              <TimeInput
                value={isTask(item) ? formData.task_time : (formData as any).event_time}
                onChange={(time) => 
                  handleInputChange(isTask(item) ? "task_time" : "event_time", time)
                }
                className="edit-form-input"
              />
            </div>

            <div className="edit-form-group">
              <label>Date *</label>
              <input
                type="date"
                value={isTask(item) ? formData.task_date : (formData as any).event_date}
                onChange={(e) => 
                  handleInputChange(isTask(item) ? "task_date" : "event_date", e.target.value)
                }
                required
                className="edit-form-input"
              />
            </div>

            {!isTask(item) && (
              <>
                <div className="edit-form-group">
                  <label>Type *</label>
                  <select
                    value={(formData as any).type}
                    onChange={(e) => handleInputChange("type", e.target.value)}
                    required
                    className="edit-form-input"
                  >
                    <option value="">Select type</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Personal">Personal</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>

                <div className="edit-form-group">
                  <label>Description</label>
                  <textarea
                    value={(formData as any).description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="edit-form-textarea"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="edit-popup-actions">
              <button
                type="button"
                onClick={onClose}
                className="edit-btn cancel"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="edit-btn save"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default EditPopup;