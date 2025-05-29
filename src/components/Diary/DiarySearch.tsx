import React, { useState, useEffect } from "react";
import { useDiary } from "../../context/DiaryContext";
import type { DiaryEntry } from "../../api/Diary";
import "./DiarySearch.css";
import DiaryDetailPopup from "./DiaryDetailPopup";
import { useNavigate } from "react-router-dom";
import { formatSafeDate } from "../../utils/dateUtils"; // Adjust the import based on your project structure

// Component type definition
const DiarySearch = () => {
  // We'll use the entries from context for searching
  const { entries: diaryEntries } = useDiary();
  const navigate = useNavigate();

  // Search parameters with proper typing
  const [searchParams, setSearchParams] = useState({
    query: "",
    startDate: "",
    endDate: "",
    mood: "",
  });

  // Popup and results states with proper typing
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [searchResults, setSearchResults] = useState<DiaryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  // Recent entries state
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const recentEntriesLimit = 5; // Show 5 most recent entries

  // Available moods for filtering
  const moods = ["happy", "sad", "neutral", "excited", "anxious"];

  // Search handler with proper typing
  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent form submission/navigation

    setIsSearching(true);

    try {
      // Local search implementation using the entries from context
      // This replaces the non-existent searchDiaryEntries function
      const filteredEntries = diaryEntries.filter((entry) => {
        // Match query text
        const matchesQuery = searchParams.query
          ? entry.title
              ?.toLowerCase()
              .includes(searchParams.query.toLowerCase()) ||
            entry.content
              ?.toLowerCase()
              .includes(searchParams.query.toLowerCase())
          : true;

        // Match date range
        const entryDateStr = (
          entry.entry_date ||
          entry.date ||
          entry.created_at ||
          ""
        ).slice(0, 10);
        const matchesStartDate = searchParams.startDate
          ? entryDateStr >= searchParams.startDate
          : true;
        const matchesEndDate = searchParams.endDate
          ? entryDateStr <= searchParams.endDate
          : true;

        // Match mood
        const matchesMood = searchParams.mood
          ? entry.mood === searchParams.mood
          : true;

        return (
          matchesQuery && matchesStartDate && matchesEndDate && matchesMood
        );
      });

      setSearchResults(filteredEntries);
      setShowSearchPopup(true); // Show popup with results
    } catch (error) {
      console.error("Error searching diary entries:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Input change handler with proper typing
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSearchParams({
      ...searchParams,
      [name]: value,
    });
  };

  // Clear filters function
  const clearFilters = () => {
    setSearchParams({
      query: "",
      startDate: "",
      endDate: "",
      mood: "",
    });
  };

  // Load recent entries on component mount or diaryEntries change
  useEffect(() => {
    if (diaryEntries && diaryEntries.length > 0) {
      // Sort by date, newest first
      const sortedEntries = [...diaryEntries].sort((a, b) => {
        const dateA = new Date(a.entry_date || a.created_at || Date.now());
        const dateB = new Date(b.entry_date || b.created_at || Date.now());
        return dateB.getTime() - dateA.getTime();
      });

      // Set the most recent entries
      setRecentEntries(sortedEntries.slice(0, recentEntriesLimit));
    }
  }, [diaryEntries]);

  // Prevent scrolling when popup is open
  useEffect(() => {
    if (showSearchPopup || selectedEntry) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showSearchPopup, selectedEntry]);

  // Helper function to get mood emoji
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

  return (
    <div className="diary-search-container">
      <div className="diary-search-header">
        <h1>Search Your Diary</h1>
      </div>

      {/* Search form - prevent navigation */}
      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-row">
          <input
            type="text"
            name="query"
            className="search-input"
            placeholder="Search for words or phrases..."
            value={searchParams.query}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            className="search-button"
            disabled={isSearching}
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="search-row">
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              name="startDate"
              className="date-input"
              value={searchParams.startDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              name="endDate"
              className="date-input"
              value={searchParams.endDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="filter-group">
            <label>Mood</label>
            <select
              name="mood"
              className="mood-select"
              value={searchParams.mood}
              onChange={handleInputChange}
            >
              <option value="">All Moods</option>
              {moods.map((mood) => (
                <option key={mood} value={mood}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="clear-filters-btn"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </form>

      {/* Recent Entries Section */}
      <div className="recent-records-container">
        <div className="recent-records-header">
          <h2>Recent Entries</h2>
          <span className="record-count">{recentEntries.length}</span>
        </div>

        {recentEntries.length === 0 ? (
          <div className="no-records">
            <div className="no-records-icon">📓</div>
            <p>You haven't written any entries yet.</p>
            <button
              className="write-entry-btn"
              onClick={() => navigate("/diary/write")}
            >
              Write Your First Entry
            </button>
          </div>
        ) : (
          <div className="compact-records-list">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="compact-record-item"
                onClick={() => setSelectedEntry(entry)}
              >
                <span className="compact-record-title">
                  {entry.title || "Untitled Entry"}
                </span>
                <span className="compact-record-divider">—</span>
                <span className="compact-record-preview">
                  {entry.content?.substring(0, 50)}
                  {(entry.content?.length || 0) > 50 ? "..." : ""}
                </span>
                <span className="compact-record-date">
                  {formatSafeDate(entry.entry_date || entry.created_at, "date")}
                </span>
                <span className="compact-record-mood">
                  {getMoodEmoji(entry.mood)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overlay and Search Results Popup */}
      {showSearchPopup && (
        <>
          <div
            className="search-popup-overlay"
            onClick={() => setShowSearchPopup(false)}
          />
          <div className="search-results-popup">
            <div className="search-popup-header">
              <h3>
                {searchResults.length}{" "}
                {searchResults.length === 1 ? "Result" : "Results"}
                {searchParams.query && ` for "${searchParams.query}"`}
              </h3>
              <button
                className="close-popup-btn"
                onClick={() => setShowSearchPopup(false)}
              >
                ×
              </button>
            </div>

            <div className="search-results-list">
              {searchResults.length === 0 ? (
                <p className="no-results">
                  No entries found matching your search.
                </p>
              ) : (
                searchResults.map((entry) => (
                  <div
                    key={entry.id}
                    className="search-result-item"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <h4>{entry.title || "Untitled Entry"}</h4>
                    <p className="result-date">
                      {formatSafeDate(
                        entry.entry_date || entry.created_at,
                        "date"
                      )}
                    </p>
                    <p className="result-preview">
                      {entry.content.substring(0, 100)}
                      {entry.content.length > 100 ? "..." : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Entry details popup when clicking on a result */}
      {selectedEntry && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {/* Rest of your component to display entries */}
      {/* ... */}
    </div>
  );
};

export default DiarySearch;
