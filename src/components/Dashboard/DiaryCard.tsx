import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { format } from "date-fns";
import DiaryDetailPopup from "../Diary/DiaryDetailPopup";
import type { DiaryEntry } from "../../api/Diary";
import "./Dashboard.css";

interface DiaryCardProps {
  entries?: DiaryEntry[];
}

/**
 * DiaryCard Component
 * Displays recent diary entries with popup details and smooth navigation
 */
const DiaryCard: React.FC<DiaryCardProps> = () => {
  const navigate = useNavigate();
  const { entries: contextEntries, loading, deleteEntry } = useDiary();
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  const dashboardRef = useRef<HTMLElement | null>(null);
  const displayEntries = contextEntries.slice(0, 5);

  /**
   * Sets up container reference for modal positioning
   * Ensures popups appear in the right place
   */
  useEffect(() => {
    dashboardRef.current =
      document.querySelector(".dashboard") || document.body;
  }, []);

  /**
   * Handles entry click
   */ const handleEntryClick = useCallback((entry: DiaryEntry) => {
    console.log("Wingman: Opening diary entry from dashboard:", entry.title);
    setSelectedEntry(entry);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  /**
   * Formats date for display with fallback handling
   */
  const formatDateDisplay = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  /**
   * Maps mood strings to appropriate emoji representations
   */
  const getMoodEmoji = (mood: string) => {
    const moods: Record<string, string> = {
      happy: "😊",
      sad: "😔",
      neutral: "😐",
      excited: "🤩",
      anxious: "😰",
    };
    return moods[mood] || "😐";
  };

  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>Your Thoughts</h2>
        </div>
        <div className="dashboard-card-content">
          <div className="diary-loading">
            Your Wingman is gathering your thoughts...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>Your Thoughts</h2>
          <button
            className="card-action-btn"
            onClick={() => navigate("/diary/write")}
          >
            Write
          </button>
        </div>

        <div className="dashboard-card-content">
          <div className="dashboard-list">
            {displayEntries.length > 0 ? (
              displayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="diary-entry-preview"
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="diary-entry-meta">
                    <h4 className="diary-entry-title">
                      {entry.title || "Untitled"}
                    </h4>
                    <span className="diary-entry-mood">
                      {getMoodEmoji(entry.mood)}
                    </span>
                  </div>
                  <p className="diary-entry-content">{entry.content}</p>
                  <div className="diary-entry-date">
                    {formatDateDisplay(entry.created_at || entry.entry_date)}
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">📝</div>
                <p>No thoughts captured yet, boss</p>
                <button
                  className="action-btn"
                  onClick={() => navigate("/diary/write")}
                >
                  Start Writing
                </button>
              </div>
            )}
          </div>

          {displayEntries.length > 0 && (
            <button
              className="view-more-btn"
              onClick={() => navigate("/diary/view")}
            >
              View All Entries
            </button>
          )}
        </div>
      </div>

      {selectedEntry && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={handleClosePopup}
          onEdit={(id) => navigate(`/diary/edit?id=${id}`)}
          onDelete={deleteEntry}
        />
      )}
    </>
  );
};

export default DiaryCard;
