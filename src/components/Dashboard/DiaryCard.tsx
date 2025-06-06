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

const DiaryCard: React.FC<DiaryCardProps> = ({ entries: propEntries }) => {
  const navigate = useNavigate();
  const { entries: contextEntries, loading, deleteEntry } = useDiary();
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  // ✅ ADD: Missing dashboardRef declaration
  const dashboardRef = useRef<HTMLElement | null>(null);

  const displayEntries = contextEntries.slice(0, 5);

  // ✅ FIXED: Set container for modal
  useEffect(() => {
    dashboardRef.current = document.querySelector(".dashboard") || document.body;
  }, []);

  // Handle entry click with position tracking
  const handleEntryClick = useCallback((entry: DiaryEntry, event: React.MouseEvent) => {
    // Get the clicked element's position
    const rect = event.currentTarget.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    
    // Calculate center of clicked entry
    const clickX = rect.left + scrollX + (rect.width / 2);
    const clickY = rect.top + scrollY + (rect.height / 2);
    
    console.log('📍 Click position:', { clickX, clickY, rect });
    
    setClickPosition({ x: clickX, y: clickY });
    setSelectedEntry(entry);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedEntry(null);
    setClickPosition(null);
  }, []);

  const handleDelete = useCallback((id: number) => {
    deleteEntry(id);
    setSelectedEntry(null);
    setClickPosition(null);
  }, [deleteEntry]);

  const handleEdit = useCallback((id: number) => {
    navigate(`/diary/edit?id=${id}`);
  }, [navigate]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

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
          <h2>📝 Today's Thoughts</h2>
        </div>
        <div className="dashboard-card-content">
          <div className="diary-loading">Loading your thoughts...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>📝 Today's Thoughts</h2>
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
                <p>No thoughts captured today</p>
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

      {/* Popup positioned at click location */}
      {selectedEntry && clickPosition && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={handleClosePopup}
          onEdit={handleEdit}
          onDelete={handleDelete}
          clickPosition={clickPosition}
        />
      )}
    </>
  );
};

export default DiaryCard;
