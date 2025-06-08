import React, { useEffect, useRef } from "react";
import { format } from "date-fns";
import "./DiaryDetailPopup.css";

interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  mood: string;
  entry_date?: string;
  created_at?: string;
  date?: string;
}

interface DiaryDetailPopupProps {
  entry: DiaryEntry;
  onClose: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

/**
 * DiaryDetailPopup Component - Your Wingman's Memory Portal
 * Fast viewport-centered popup with no lag
 */
const DiaryDetailPopup: React.FC<DiaryDetailPopupProps> = ({
  entry,
  onClose,
  onEdit,
  onDelete,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  /**
   * ✅ SIMPLE EVENT HANDLING - No complex scroll locking
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const getMoodEmoji = (mood: string) => {
    const moods: Record<string, string> = {
      happy: "😊",
      sad: "😔",
      neutral: "😐",
      excited: "🤩",
      anxious: "😰",
      angry: "😡",
      relaxed: "😌",
    };
    return moods[mood] || "😐";
  };

  const formatDate = (entry: DiaryEntry) => {
    try {
      const dateStr = entry.created_at || entry.entry_date || entry.date;
      return format(new Date(dateStr), "EEEE, MMMM d, yyyy");
    } catch {
      return entry.created_at || entry.entry_date || entry.date || "";
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this entry, boss?")) {
      onClose(); // Close popup immediately after confirmation
      try {
        await onDelete(entry.id);
      } catch (error) {
        console.error("Error deleting entry:", error);
        alert("Failed to delete entry. Please try again.");
      }
    }
  };

  return (
    <div className="diary-popup-overlay">
      <div ref={popupRef} className="diary-popup-content">
        <button className="diary-popup-close" onClick={onClose}>
          ✕
        </button>

        <div className="diary-popup-header">
          <h2 className="diary-popup-title">{entry.title}</h2>
          <div className="diary-popup-meta">
            <span className="diary-popup-mood">{getMoodEmoji(entry.mood)}</span>
            <span className="diary-popup-date">{formatDate(entry)}</span>
          </div>
        </div>

        <div className="diary-popup-content-text">{entry.content}</div>

        <div className="diary-popup-actions">
          <button className="diary-popup-edit" onClick={() => onEdit(entry.id)}>
            Edit Entry
          </button>
          <button className="diary-popup-delete" onClick={handleDelete}>
            Delete Entry
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiaryDetailPopup;
