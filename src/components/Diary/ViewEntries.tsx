import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import DiaryDetailPopup from "./DiaryDetailPopup";
import { format } from "date-fns";
import "./ViewEntries.css";

const ViewEntries: React.FC = () => {
  const navigate = useNavigate();
  const { entries, loading, deleteEntry } = useDiary();

  // ✅ EXISTING: Your state variables
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // ✅ NEW: Only adding click position tracking
  const [clickPosition, setClickPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // ✅ EXISTING: Your computation logic - UNTOUCHED
  const groupedEntries = useMemo(() => {
    const grouped: Record<string, any[]> = {};

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

  // ✅ EXISTING: Your month logic - UNTOUCHED
  const sortedMonths = useMemo(() => {
    const months = Object.keys(groupedEntries).sort().reverse();
    if (months.length > 0 && !expandedMonth) {
      setExpandedMonth(months[0]);
    }
    return months;
  }, [groupedEntries, expandedMonth]);

  // ✅ EXISTING: Your functions - UNTOUCHED
  const toggleMonth = (monthKey: string) => {
    setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  const handleEdit = (id: number) => {
    navigate(`/diary/edit?id=${id}`);
  };

  const handleDelete = async (id: number) => {
    await deleteEntry(id);
    setSelectedEntry(null);
    setClickPosition(null); // ✅ NEW: Clear position on delete
  };

  const getMoodEmoji = (mood: string) => {
    const moods: Record<string, string> = {
      happy: "😊",
      sad: "😢",
      excited: "😃",
      angry: "😡",
      relaxed: "😌",
      neutral: "😐",
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

  // ✅ NEW: Click handler with position tracking
  const handleEntryClick = (entry: any, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    const clickX = rect.left + scrollX + rect.width / 2;
    const clickY = rect.top + scrollY + rect.height / 2;

    setClickPosition({ x: clickX, y: clickY });
    setSelectedEntry(entry);
  };

  // ✅ NEW: Close handler
  const handleClosePopup = () => {
    setSelectedEntry(null);
    setClickPosition(null);
  };

  if (loading) {
    return (
      <div className="view-entries-container">
        <div className="diary-loading">Loading entries...</div>
      </div>
    );
  }

  return (
    <div className="view-entries-container">
      <div className="view-entries-header">
        <h2>Diary Entries ({entries.length})</h2>
        <div className="view-entries-actions">
          <button
            className="search-entries-btn"
            onClick={() => navigate("/diary/search")}
          >
            Search
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
          <p>No diary entries yet</p>
          <button
            className="write-entry-btn"
            onClick={() => navigate("/diary/write")}
          >
            Write Your First Entry
          </button>
        </div>
      )}

      {/* ✅ NEW: Positioned popup */}
      {selectedEntry && clickPosition && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={handleClosePopup}
          onEdit={handleEdit}
          onDelete={handleDelete}
          clickPosition={clickPosition}
        />
      )}
    </div>
  );
};

export default ViewEntries;