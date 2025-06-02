import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { format } from "date-fns";
import DiaryDetailPopup from "./DiaryDetailPopup";
import type { DiaryEntry } from "../../api/Diary";
import "./DiarySearch.css";

const DiarySearch: React.FC = () => {
  const navigate = useNavigate();
  const { entries: diaryEntries, loading } = useDiary();

  // ✅ SIMPLIFIED: Search state management
  const [searchParams, setSearchParams] = useState({
    query: "",
    startDate: "",
    endDate: "",
    mood: "",
  });

  // ✅ KEEP: Popup and results states
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [searchResults, setSearchResults] = useState<DiaryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  // ✅ KEEP: Recent entries functionality
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const recentEntriesLimit = 8;

  // ✅ KEEP: Available moods for filtering
  const moods = ["happy", "sad", "neutral", "excited", "anxious", "angry", "relaxed"];

  // ✅ IMPROVED: Real-time search with useMemo for performance
  const filteredResults = useMemo(() => {
    if (!searchParams.query && !searchParams.startDate && !searchParams.endDate && !searchParams.mood) {
      return [];
    }

    return diaryEntries.filter((entry) => {
      // Match query text
      const matchesQuery = searchParams.query
        ? entry.title?.toLowerCase().includes(searchParams.query.toLowerCase()) ||
          entry.content?.toLowerCase().includes(searchParams.query.toLowerCase())
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

      return matchesQuery && matchesStartDate && matchesEndDate && matchesMood;
    });
  }, [diaryEntries, searchParams]);

  // ✅ IMPROVED: Auto-trigger search when params change
  useEffect(() => {
    if (searchParams.query || searchParams.startDate || searchParams.endDate || searchParams.mood) {
      setIsSearching(true);
      
      // Debounce for text search
      const timeoutId = setTimeout(() => {
        setSearchResults(filteredResults);
        setShowSearchPopup(filteredResults.length > 0);
        setIsSearching(false);
      }, searchParams.query ? 300 : 0);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowSearchPopup(false);
    }
  }, [filteredResults, searchParams]);

  // ✅ SIMPLIFIED: Handle form submission
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Search is already handled by useEffect above
  };

  // ✅ KEEP: Input change handler
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ KEEP: Clear filters function
  const clearFilters = () => {
    setSearchParams({
      query: "",
      startDate: "",
      endDate: "",
      mood: "",
    });
    setShowSearchPopup(false);
  };

  // ✅ KEEP: Load recent entries on component mount
  useEffect(() => {
    if (diaryEntries && diaryEntries.length > 0) {
      const sortedEntries = [...diaryEntries].sort((a, b) => {
        const dateA = new Date(a.created_at || a.entry_date || a.date || "").getTime();
        const dateB = new Date(b.created_at || b.entry_date || b.date || "").getTime();
        return dateB - dateA;
      });

      setRecentEntries(sortedEntries.slice(0, recentEntriesLimit));
    }
  }, [diaryEntries, recentEntriesLimit]);

  // ✅ KEEP: Prevent scrolling when popup is open
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

  // ✅ KEEP: Helper function to get mood emoji
  const getMoodEmoji = (mood: string = "neutral") => {
    const moodMap: Record<string, string> = {
      happy: "😊",
      sad: "😔", 
      neutral: "😐",
      excited: "🤩",
      anxious: "😰",
      angry: "😡",
      relaxed: "😌",
    };
    return moodMap[mood] || moodMap.neutral;
  };

  // ✅ KEEP: Format time function
  const formatTime = (timeStr: string): string => {
    if (!timeStr) return "";

    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
    }

    return timeStr;
  };

  // ✅ IMPROVED: Format date display
  const formatDateDisplay = (entry: DiaryEntry) => {
    try {
      const dateStr = entry.created_at || entry.entry_date || entry.date;
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return entry.created_at || entry.entry_date || entry.date || "";
    }
  };

  // ✅ KEEP: Handle entry selection
  const handleEntryClick = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setShowSearchPopup(false);
  };

  const hasActiveFilters = searchParams.query || searchParams.startDate || searchParams.endDate || searchParams.mood;

  return (
    <div className="diary-search-container">
      {/* ✅ CLEAN: Search header */}
      <div className="diary-search-header">
        <h1>Search Diary Entries</h1>
        {hasActiveFilters && (
          <button className="filters-toggle-btn" onClick={clearFilters}>
            Clear All Filters
          </button>
        )}
      </div>

      {/* ✅ IMPROVED: Search form */}
      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-row">
          <input
            type="text"
            name="query"
            className="search-input"
            placeholder="Search by title or content..."
            value={searchParams.query}
            onChange={handleInputChange}
          />
          <button 
            type="submit" 
            className="search-button"
            disabled={isSearching}
          >
            {isSearching ? (
              <>
                <span className="search-loading">🔄</span>
                Constantly digging for you!
              </>
            ) : (
              <>
                <span className="search-icon">🔍</span>
                Start Typing Bro
              </>
            )}
          </button>
        </div>

        <div className="search-filters">
          <div className="date-range">
            <input
              type="date"
              name="startDate"
              className="date-input"
              value={searchParams.startDate}
              onChange={handleInputChange}
              placeholder="Start date"
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              name="endDate"
              className="date-input"
              value={searchParams.endDate}
              onChange={handleInputChange}
              placeholder="End date"
            />
          </div>

          <select
            name="mood"
            className="mood-select"
            value={searchParams.mood}
            onChange={handleInputChange}
          >
            <option value="">All moods</option>
            {moods.map((mood) => (
              <option key={mood} value={mood}>
                {getMoodEmoji(mood)} {mood}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filters-btn"
              onClick={clearFilters}
              title="Clear all filters"
            >
              🧹 Clear
            </button>
          )}
        </div>
      </form>

      {/* ✅ KEEP: Recent entries section */}
      <div className="recent-records-container">
        <div className="recent-records-header">
          <h2>Recent Entries</h2>
          <span className="record-count">{recentEntries.length}</span>
        </div>

        {loading ? (
          <div className="searching-indicator">
            <div className="loading-spinner"></div>
            <p>Loading entries...</p>
          </div>
        ) : recentEntries.length > 0 ? (
          <div className="compact-records-list">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="compact-record-item"
                onClick={() => handleEntryClick(entry)}
              >
                <div className="compact-record-header">
                  <h4 className="compact-record-title">{entry.title}</h4>
                  <div className="compact-record-meta">
                    <span className="compact-record-mood">
                      {getMoodEmoji(entry.mood)}
                    </span>
                    <span className="compact-record-date">
                      {formatDateDisplay(entry)}
                    </span>
                  </div>
                </div>
                
                <p className="compact-record-preview">
                  {entry.content?.substring(0, 120)}
                  {entry.content?.length > 120 && "..."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-records">
            <div className="no-records-icon">📝</div>
            <p>No diary entries found</p>
            <button 
              className="write-entry-btn"
              onClick={() => navigate("/diary/write")}
            >
              Write Your First Entry
            </button>
          </div>
        )}
      </div>

      {/* ✅ KEEP: Search results popup */}
      {showSearchPopup && (
        <div className="search-popup-overlay" onClick={() => setShowSearchPopup(false)}>
          <div className="search-results-popup" onClick={(e) => e.stopPropagation()}>
            <div className="search-popup-header">
              <h3>I found them! ({searchResults.length})</h3>
              <button 
                className="close-popup-btn"
                onClick={() => setShowSearchPopup(false)}
              >
                ✕
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="search-results-list">
                {searchResults.map((entry) => (
                  <div
                    key={entry.id}
                    className="search-result-item"
                    onClick={() => handleEntryClick(entry)}
                  >
                    <div className="result-header">
                      <h4>{entry.title}</h4>
                      <div className="result-meta">
                        <span className="result-mood">
                          {getMoodEmoji(entry.mood)}
                        </span>
                        <span className="result-date">
                          {formatDateDisplay(entry)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="result-preview">
                      {entry.content?.substring(0, 150)}
                      {entry.content?.length > 150 && "..."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <p>No entries match your search criteria</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ KEEP: Detail popup */}
      {selectedEntry && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={(id: number) => navigate(`/diary/edit?id=${id}`)}
          onDelete={(id: number) => {
            // Handle delete if needed
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
};

export default DiarySearch;