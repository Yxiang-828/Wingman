import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import DiaryDetailPopup from "./DiaryDetailPopup";
import type { DiaryEntry } from "../../api/Diary";
import { formatSafeDate } from "../../utils/dateUtils";
import type { MonthData } from "../../types/diary";
import "./ViewEntries.css";

const ViewEntries: React.FC = () => {
  const navigate = useNavigate();
  // Remove unused variables by not destructuring them
  const { entries, loading } = useDiary();
  const [groupedEntries, setGroupedEntries] = useState<
    Record<string, MonthData>
  >({});
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [page, setPage] = useState(1);
  const entriesPerPage = 5; // Reduced from 8 to show fewer entries initially
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  // Keep successMessage even if unused currently, but mark it as unused
  const [successMessage, _setSuccessMessage] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // More accurate calculation of displayed entries
  const totalEntriesDisplayed = expandedMonth
    ? groupedEntries[expandedMonth]?.entries.slice(0, page * entriesPerPage)
        .length || 0
    : 0;

  // Make sure this condition is more explicit
  const hasMoreEntries =
    expandedMonth &&
    groupedEntries[expandedMonth]?.entries.length > page * entriesPerPage;

  // Group entries by month for better organization
  useEffect(() => {
    if (!loading && entries.length > 0) {
      const grouped: Record<string, MonthData> = {};

      entries.forEach((entry) => {
        // Use entry_date if available, otherwise fallback to created_at with safe default
        const dateValue =
          entry.entry_date || entry.created_at || new Date().toISOString();
        let date: Date;

        try {
          // Try to parse the date
          date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date detected: ${dateValue}`, entry);
            date = new Date(); // Fallback to current date
          }
        } catch (error) {
          console.error(`Error parsing date: ${dateValue}`, error);
          date = new Date(); // Fallback to current date
        }

        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthName = date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        });

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            name: monthName,
            entries: [],
            count: 0,
          };
        }

        grouped[monthKey].entries.push(entry);
        grouped[monthKey].count = grouped[monthKey].entries.length;
      });

      // Sort entries in each month by date (newest first)
      Object.keys(grouped).forEach((key) => {
        grouped[key].entries.sort((a: DiaryEntry, b: DiaryEntry) => {
          // Fix TypeError: Add a fallback value for date creation
          const dateA = new Date(a.entry_date || a.created_at || Date.now());
          const dateB = new Date(b.entry_date || b.created_at || Date.now());
          return dateB.getTime() - dateA.getTime();
        });
      });

      // Set the most recent month as expanded by default
      const sortedMonths = Object.keys(grouped).sort().reverse();
      if (sortedMonths.length > 0 && !expandedMonth) {
        setExpandedMonth(sortedMonths[0]);
      }

      setGroupedEntries(grouped);
    }
  }, [entries, loading, expandedMonth]);

  // Toggle month expand/collapse
  const toggleMonth = (monthKey: string) => {
    setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  // View an entry in detail
  const viewEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
  };

  // Load more entries function with loading state
  const handleLoadMore = () => {
    if (loadingMore) return; // Prevent multiple simultaneous loads

    setLoadingMore(true);
    const nextPage = page + 1;

    setPage(nextPage);
    setLoadingMore(false);
  };

  // Scroll handler to detect when user is near the bottom
  const handleScroll = useCallback(() => {
    if (!containerRef.current || loadingMore || !hasMoreEntries) return;

    const container = containerRef.current;
    const scrollBottom = container.scrollTop + container.clientHeight;
    const nearBottom = scrollBottom >= container.scrollHeight - 200; // 200px from bottom

    if (nearBottom) {
      handleLoadMore();
    }
  }, [loadingMore, hasMoreEntries, page]); // Now hasMoreEntries is defined before use

  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]);

  // Helper function to get the mood emoji
  const getMoodEmoji = (mood: string = "neutral") => {
    const moodMap: Record<string, string> = {
      happy: "😊",
      sad: "😔",
      neutral: "😐",
      excited: "🤩",
      anxious: "😰",
    };
    return moodMap[mood] || moodMap.neutral;
  };

  // Create a new entry
  const createNewEntry = () => {
    navigate("/diary/write");
  };

  // Go to search page
  const goToSearch = () => {
    navigate("/diary/search");
  };

  return (
    <div className="diary-card view-entries-container" ref={containerRef}>
      <div className="view-entries-header">
        <h2>Your Diary</h2>
        <div className="view-entries-actions">
          <button className="search-entries-btn" onClick={goToSearch}>
            Search
          </button>
          <button className="write-entry-btn" onClick={createNewEntry}>
            Write New Entry
          </button>
        </div>
      </div>

      {loading ? (
        <div className="diary-loading">Loading entries...</div>
      ) : entries.length > 0 ? (
        <>
          <div className="entries-by-month">
            {Object.keys(groupedEntries)
              .sort((a, b) => b.localeCompare(a))
              .map((monthKey) => {
                const monthData = groupedEntries[monthKey];
                const isExpanded = expandedMonth === monthKey;

                return (
                  <div key={monthKey} className="month-group">
                    <div
                      className={`month-header ${isExpanded ? "expanded" : ""}`}
                      onClick={() => toggleMonth(monthKey)}
                    >
                      <h3>{monthData.name}</h3>
                      <span className="entry-count">
                        {monthData.entries.length}{" "}
                        {monthData.entries.length === 1 ? "entry" : "entries"}
                      </span>
                      <span className="expand-indicator">
                        {isExpanded ? "▼" : "►"}
                      </span>
                    </div>

                    <div
                      className={`month-entries ${
                        isExpanded ? "expanded" : ""
                      }`}
                    >
                      {isExpanded &&
                        monthData.entries
                          .slice(0, page * entriesPerPage)
                          .map((entry: DiaryEntry) => (
                            <div
                              key={entry.id}
                              className="diary-entry-preview"
                              onClick={() => viewEntry(entry)}
                            >
                              <div className="entry-preview-header">
                                <div className="entry-preview-date-mood">
                                  <span className="entry-preview-date">
                                    {formatSafeDate(
                                      entry.entry_date || entry.created_at,
                                      "date"
                                    )}
                                  </span>
                                  <span className="entry-preview-mood">
                                    {getMoodEmoji(entry.mood)}
                                  </span>
                                </div>
                                <h4 className="entry-preview-title">
                                  {entry.title || "Untitled Entry"}
                                </h4>
                              </div>
                              <p className="entry-preview-content">
                                {entry.content.substring(0, 150)}
                                {entry.content.length > 150 ? "..." : ""}
                              </p>
                              <div className="entry-preview-footer">
                                <span className="read-more">Read more →</span>
                              </div>
                            </div>
                          ))}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Load More Section - Always show when there are entries */}
          {entries.length > 0 && (
            <div className="load-more-container">
              {loadingMore ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Loading more entries...</span>
                </>
              ) : (
                <button
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={!hasMoreEntries}
                >
                  {hasMoreEntries
                    ? `Load More Entries (${
                        entries.length - totalEntriesDisplayed
                      } remaining)`
                    : "All Entries Loaded"}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="diary-empty-state">
          <p>You haven't written any entries yet. Start writing today!</p>
          <button className="write-entry-btn" onClick={createNewEntry}>
            Write Your First Entry
          </button>
        </div>
      )}

      {selectedEntry && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {showSuccessMessage && (
        <div className="success-message">
          {successMessage}
          <button
            className="close-btn"
            onClick={() => setShowSuccessMessage(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewEntries;
