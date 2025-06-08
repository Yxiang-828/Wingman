import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { format } from "date-fns";
import DiaryDetailPopup from "../Diary/DiaryDetailPopup";
import "./Dashboard.css";

interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  mood: string;
  entry_date: string;
  created_at: string;
}

interface DiaryCardProps {
  entries?: DiaryEntry[];
}

/**
 * DiaryCard Component - Your Wingman's Memory Palace
 * Displays recent diary entries with popup details and smooth navigation
 * Your thoughts organized and ready for review, boss
 */
const DiaryCard: React.FC<DiaryCardProps> = ({ entries: propEntries }) => {
  const navigate = useNavigate();
  const { entries: contextEntries, loading, deleteEntry } = useDiary();
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  const dashboardRef = useRef<HTMLElement | null>(null);
  const displayEntries = contextEntries.slice(0, 5);

  /**
   * Sets up container reference for modal positioning
   * Your Wingman ensures popups appear in the right place
   */
  useEffect(() => {
    dashboardRef.current =
      document.querySelector(".dashboard") || document.body;
  }, []);

  /**
   * Handles entry click - simplified without position tracking
   * Your Wingman opens the memory portal perfectly centered
   */
  const handleEntryClick = useCallback(
    (entry: DiaryEntry, event: React.MouseEvent) => {
      console.log("Wingman: Opening diary entry from dashboard:", entry.title);
      setSelectedEntry(entry);
    },
    []
  );

  const handleClosePopup = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  /**
   * Formats date for display with fallback handling
   * Your Wingman ensures dates always look proper
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
   * Your Wingman understands your emotional expressions
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
                  onClick={(event) => handleEntryClick(entry, event)}
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
