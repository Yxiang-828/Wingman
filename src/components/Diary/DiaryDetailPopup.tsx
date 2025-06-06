import React, { useEffect, useCallback, memo, useState } from "react";
import { format } from "date-fns";
import "./DiaryDetailPopup.css";

interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  mood: string;
  entry_date: string;
  created_at: string;
}

interface DiaryDetailPopupProps {
  entry: DiaryEntry;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  clickPosition?: { x: number; y: number }; // ✅ NEW: Click position
}

const getMoodEmoji = (mood: string): string => {
  const moods: Record<string, string> = {
    happy: "😊",
    sad: "😔",
    neutral: "😐",
    excited: "🤩",
    anxious: "😰",
  };
  return moods[mood] || "😐";
};

const getMoodLabel = (mood: string): string => {
  const labels: Record<string, string> = {
    happy: "Happy",
    sad: "Sad",
    neutral: "Neutral",
    excited: "Excited",
    anxious: "Anxious",
  };
  return labels[mood] || "Unknown";
};

const DiaryDetailPopup: React.FC<DiaryDetailPopupProps> = memo(
  ({ entry, onClose, onEdit, onDelete, clickPosition }) => {
    const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(
      null
    ); // ✅ Start as null

    useEffect(() => {
      if (clickPosition) {
        const popupWidth = 600;
        const popupHeight = 400;
        const margin = 20;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Calculate initial position (centered on click)
        let left = clickPosition.x - popupWidth / 2;
        let top = clickPosition.y - popupHeight / 2;

        // Adjust if popup would go off-screen
        if (left < scrollX + margin) {
          left = scrollX + margin;
        } else if (left + popupWidth > scrollX + viewportWidth - margin) {
          left = scrollX + viewportWidth - popupWidth - margin;
        }

        if (top < scrollY + margin) {
          top = scrollY + margin;
        } else if (top + popupHeight > scrollY + viewportHeight - margin) {
          top = scrollY + viewportHeight - popupHeight - margin;
        }

        setPopupStyle({
          position: "absolute",
          left: `${left}px`,
          top: `${top}px`,
          zIndex: 1000,
        });
      }
    }, [clickPosition]);

    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      },
      [onClose]
    );

    const handleOverlayClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      },
      [onClose]
    );

    useEffect(() => {
      document.addEventListener("keydown", handleEscape, { passive: true });
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }, [handleEscape]);

    const formattedDate = React.useMemo(() => {
      try {
        return format(new Date(entry.entry_date), "EEEE, MMMM d, yyyy");
      } catch {
        return entry.entry_date || "Unknown date";
      }
    }, [entry.entry_date]);

    const moodData = React.useMemo(
      () => ({
        emoji: getMoodEmoji(entry.mood),
        label: getMoodLabel(entry.mood),
      }),
      [entry.mood]
    );

    // ✅ DON'T RENDER until position is calculated
    if (!popupStyle) {
      return null;
    }

    return (
      <div
        className="diary-popup-overlay"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diary-popup-title"
      >
        {/* ✅ POSITIONED: Popup appears over clicked entry */}
        <div className="diary-popup-content" style={popupStyle}>
          <button
            className="diary-popup-close"
            onClick={onClose}
            aria-label="Close diary entry"
            type="button"
          >
            ×
          </button>

          <div className="diary-popup-header">
            <h2 id="diary-popup-title" className="diary-popup-title">
              {entry.title || "Untitled Entry"}
            </h2>

            <div className="diary-popup-meta">
              <span className="diary-popup-date">{formattedDate}</span>
              <div className="diary-popup-mood">
                <span>{moodData.emoji}</span>
                <span>{moodData.label}</span>
              </div>
            </div>
          </div>

          <div className="diary-popup-content-text">
            {entry.content || "No content available."}
          </div>

          {(onEdit || onDelete) && (
            <div className="diary-popup-actions">
              {onEdit && (
                <button
                  className="diary-action-btn edit"
                  onClick={() => onEdit(entry.id)}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  className="diary-action-btn delete"
                  onClick={() => onDelete(entry.id)}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

DiaryDetailPopup.displayName = "DiaryDetailPopup";

export default DiaryDetailPopup;
