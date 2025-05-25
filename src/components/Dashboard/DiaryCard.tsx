import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import DiaryDetailPopup from "../Diary/DiaryDetailPopup";
import { format } from "date-fns";
import "./Dashboard.css";

interface DiaryCardProps {
  entries?: any[]; // Make entries optional
}

const DiaryCard: React.FC<DiaryCardProps> = ({ entries: propEntries }) => {
  const navigate = useNavigate();
  const { entries, loading, deleteEntry, refreshEntries } = useDiary();
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);
  const [displayEntries, setDisplayEntries] = useState<any[]>([]);

  // Find dashboard container for modal positioning
  useEffect(() => {
    dashboardRef.current =
      document.querySelector(".dashboard") ||
      document.querySelector(".dashboard-container") ||
      document.getElementById("dashboard");
  }, []);

  // If entries are passed as props, use those; otherwise, use entries from context
  useEffect(() => {
    // Display recent diary entries summary in dashboard
    // Fetch diary entries and map them here with title + date + snippet
    if (propEntries && propEntries.length > 0) {
      setDisplayEntries(propEntries.slice(0, 3)); // Show at most 3 entries
    } else if (entries && entries.length > 0) {
      // Sort entries by date (newest first) and take the most recent ones
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setDisplayEntries(sortedEntries.slice(0, 3)); // Show at most 3 entries
    } else {
      setDisplayEntries([]);
    }
  }, [propEntries, entries]);

  // Refresh diary entries when component mounts
  useEffect(() => {
    refreshEntries();
  }, []);

  const handleEntryClick = (entry: any) => {
    setSelectedEntry(entry);
  };

  const handleDelete = (id: number) => {
    deleteEntry(id);
    setSelectedEntry(null);
  };

  const handleEdit = (id: number) => {
    navigate(`/diary/edit?id=${id}`); // Make sure we use the correct path
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "MMM d, yyyy");
    } catch (e) {
      return dateStr;
    }
  };

  // Truncate text to a shorter length
  const truncateTextDisplay = (text: string, maxLength: number = 40) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // Get mood emoji
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
        return "😐"; // neutral
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
      {loading ? (
        <div className="card-loading">Loading entries...</div>
      ) : displayEntries && displayEntries.length > 0 ? (
        <ul className="entries-list">
          {displayEntries.map((entry) => (
            <li
              key={entry.id}
              className="entry-item"
              onClick={() => handleEntryClick(entry)}
            >
              <div className="entry-header">
                <h3>{entry.title}</h3>
                <div className="entry-date">
                  <span className="entry-mood">{getMoodEmoji(entry.mood)}</span>
                  {formatDateDisplay(entry.entry_date || entry.date)}
                </div>
              </div>
              <div className="entry-preview">
                {truncateTextDisplay(entry.content)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <p>No diary entries yet</p>
          <button
            className="action-btn small"
            onClick={() => navigate("/diary/write")}
          >
            Write First Entry
          </button>
        </div>
      )}

      {/* Popup for diary entry details - now using the dashboard container */}
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
