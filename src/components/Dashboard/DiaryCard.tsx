import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { format } from "date-fns";
import DiaryDetailPopup from "../Diary/DiaryDetailPopup";
import "./Dashboard.css";
import "./DiaryCard.css";

interface DiaryCardProps {
  entries?: any[]; // Optional prop entries
}

const DiaryCard: React.FC<DiaryCardProps> = ({ entries: propEntries }) => {
  const navigate = useNavigate();
  const { entries: contextEntries, loading, deleteEntry } = useDiary();
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);

  // ✅ SIMPLIFIED: Just use context entries, ignore props
  const displayEntries = contextEntries.slice(0, 5);

  // Set container for modal
  useEffect(() => {
    dashboardRef.current =
      document.querySelector(".dashboard") || document.body;
  }, []);

  const handleEntryClick = (entry: any) => setSelectedEntry(entry);
  const handleDelete = (id: number) => {
    deleteEntry(id);
    setSelectedEntry(null);
  };
  const handleEdit = (id: number) => navigate(`/diary/edit?id=${id}`);

  const formatDateDisplay = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const truncateTextDisplay = (text: string, maxLength = 40) =>
    text?.length > maxLength ? text.slice(0, maxLength) + "..." : text;

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case "happy":
        return "😊";
      case "sad":
        return "😢";
      case "excited":
        return "😃";
      case "angry":
        return "😡";
      case "relaxed":
        return "😌";
      default:
        return "😐";
    }
  };

  return (
    <div className="dashboard-card diary-card">
      <div className="dashboard-card-header">
        <h2>Recent Diary</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/diary/view")}
        >
          View All
        </button>
      </div>

      <div className="dashboard-card-content">
        {loading ? (
          <div className="dashboard-loading">Loading entries...</div>
        ) : displayEntries.length > 0 ? (
          <div className="dashboard-list">
            {displayEntries.map((entry) => (
              <div
                key={entry.id}
                className="dashboard-item diary-entry"
                onClick={() => handleEntryClick(entry)}
              >
                <div className="dc-entry-content">
                  <h3 className="dc-entry-title">{entry.title}</h3>
                  {entry.content && (
                    <div className="dc-entry-preview">
                      - {truncateTextDisplay(entry.content)}
                    </div>
                  )}
                </div>

                <div className="dc-entry-meta">
                  <span className="dc-entry-mood">
                    {getMoodEmoji(entry.mood)}
                  </span>
                  <span className="dc-entry-date">
                    {formatDateDisplay(
                      entry.created_at || entry.entry_date || entry.date
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">📝</div>
            <p>No diary entries yet</p>
            <button
              className="action-btn"
              onClick={() => navigate("/diary/write")}
            >
              Write First Entry
            </button>
          </div>
        )}
      </div>

      {selectedEntry && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          container={dashboardRef.current || undefined}
        />
      )}
    </div>
  );
};

export default DiaryCard;
