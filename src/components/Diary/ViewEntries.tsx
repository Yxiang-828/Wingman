import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import DiaryDetailPopup from "./DiaryDetailPopup";
import { format } from "date-fns";
import "./ViewEntries.css";

/**
 * ViewEntries Component - Your Wingman's Chronicle Archive
 * Month-grouped diary display with click-positioned detail popups
 * Where memories are organized and explored with precision
 */
const ViewEntries: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { entries, loading, deleteEntry } = useDiary();

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Groups entries by month with proper date handling
   * Your Wingman organizes memories chronologically
   */
  const groupedEntries = useMemo(() => {
    const grouped: Record<string, any> = {};

    entries.forEach((entry) => {
      const date = new Date(entry.created_at || entry.entry_date || entry.date);
      const monthKey = format(date, "yyyy-MM");
      const monthName = format(date, "MMMM yyyy");

      if (!grouped[monthKey]) {
        grouped[monthKey] = { monthName, entries: [] };
      }
      grouped[monthKey].entries.push(entry);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].entries.sort(
        (a: any, b: any) =>
          new Date(b.created_at || b.entry_date || b.date).getTime() -
          new Date(a.created_at || a.entry_date || a.date).getTime()
      );
    });

    return grouped;
  }, [entries]);

  /**
   * Manages month expansion with auto-expand for most recent
   * Your Wingman shows recent memories first
   */
  const sortedMonths = useMemo(() => {
    const months = Object.keys(groupedEntries).sort().reverse();
    if (months.length > 0 && !expandedMonth) {
      setExpandedMonth(months[0]);
    }
    return months;
  }, [groupedEntries, expandedMonth]);

  /**
   * Handles success message from navigation state
   * Your Wingman acknowledges completed actions
   */
  React.useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  const handleEdit = (id: number) => {
    setSelectedEntry(null);
    navigate(`/diary/edit?id=${id}`);
  };

  /**
   * Handles entry deletion with confirmation
   * Your Wingman protects against accidental losses
   */
  const handleDelete = async (id: number) => {
    try {
      await deleteEntry(id);
      console.log("Wingman: Entry deleted successfully:", id);
    } catch (error) {
      console.error("Wingman: Error deleting entry:", error);
      alert("Failed to delete entry, boss. Please try again.");
    }
  };

  /**
   * Maps mood strings to emoji representations
   * Your Wingman understands emotional context
   */
  const getMoodEmoji = (mood: string) => {
    const moods: Record<string, string> = {
      happy: "😊",
      sad: "😢",
      excited: "🤩",
      angry: "😡",
      relaxed: "😌",
      neutral: "😐",
      anxious: "😰",
    };
    return moods[mood] || "😐";
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d");
    } catch {
      return dateStr;
    }
  };

  /**
   * Handles entry click - simplified without position tracking
   * Your Wingman opens the memory portal in the center of your view
   */
  const handleEntryClick = (entry: any, event: React.MouseEvent) => {
    console.log("Wingman: Opening entry details:", entry.title);
    setSelectedEntry(entry);
  };

  const handleClosePopup = () => {
    setSelectedEntry(null);
  };

  if (loading) {
    return (
      <div className="view-entries-container">
        <div className="diary-loading">
          <div className="loading-spinner"></div>
          <p>Your Wingman is gathering your memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-entries-container">
      <div className="view-entries-header">
        <h2>Your Chronicle ({entries.length} entries)</h2>
        <div className="view-entries-actions">
          <button
            className="search-entries-btn"
            onClick={() => navigate("/diary/search")}
          >
            Search Memories
          </button>
          <button
            className="write-entry-btn"
            onClick={() => navigate("/diary/write")}
          >
            Write Entry
          </button>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="entries-by-month">
          {sortedMonths.map((monthKey) => {
            const monthData = groupedEntries[monthKey];
            const isExpanded = expandedMonth === monthKey;

            return (
              <div key={monthKey} className="month-group">
                <div
                  className={`month-header ${isExpanded ? "expanded" : ""}`}
                  onClick={() => toggleMonth(monthKey)}
                >
                  <h3>{monthData.monthName}</h3>
                  <div className="month-info">
                    <span className="entry-count">
                      {monthData.entries.length}
                    </span>
                    <span className="expand-indicator">▼</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="month-entries">
                    {monthData.entries.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="diary-entry-preview"
                        onClick={(event) => handleEntryClick(entry, event)}
                      >
                        <div className="entry-preview-header">
                          <div className="entry-preview-date-mood">
                            <span className="entry-preview-date">
                              {formatDateDisplay(
                                entry.created_at ||
                                  entry.entry_date ||
                                  entry.date
                              )}
                            </span>
                            <span className="entry-preview-mood">
                              {getMoodEmoji(entry.mood)}
                            </span>
                          </div>
                          <h4 className="entry-preview-title">{entry.title}</h4>
                        </div>

                        <p className="entry-preview-content">
                          {entry.content?.substring(0, 120)}
                          {entry.content?.length > 120 && "..."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="diary-empty-state">
          <div className="diary-empty-icon">📝</div>
          <p>No thoughts captured yet, boss</p>
          <p>Your chronicles await your first entry</p>
          <button
            className="write-entry-btn"
            onClick={() => navigate("/diary/write")}
          >
            Begin Your Chronicle
          </button>
        </div>
      )}

      {selectedEntry && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={handleClosePopup}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {successMessage && (
        <div className="success-message">
          <span>✓ {successMessage}</span>
          <button className="close-btn" onClick={() => setSuccessMessage(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewEntries;
