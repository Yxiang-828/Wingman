import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { debounce } from "../../utils/helpers";
import { format } from "date-fns";
import "./DiarySearch.css";

interface SearchParams {
  query: string;
  startDate: string;
  endDate: string;
  mood: string;
}

const DiarySearch: React.FC = () => {
  const navigate = useNavigate();
  const { entries } = useDiary();
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: "",
    startDate: "",
    endDate: "",
    mood: "",
  });
  const [results, setResults] = useState(entries);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Available moods for filtering
  const moods = ["happy", "sad", "neutral", "excited", "tired"];

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((params: SearchParams) => {
      setIsSearching(true);

      try {
        // Filter entries based on search parameters
        const filtered = entries.filter((entry) => {
          // Text search in title and content
          const textMatch =
            !params.query ||
            entry.title.toLowerCase().includes(params.query.toLowerCase()) ||
            entry.content.toLowerCase().includes(params.query.toLowerCase());

          // Date range filtering
          const dateMatch =
            (!params.startDate || entry.date >= params.startDate) &&
            (!params.endDate || entry.date <= params.endDate);

          // Mood filtering
          const moodMatch = !params.mood || entry.mood === params.mood;

          return textMatch && dateMatch && moodMatch;
        });

        setResults(filtered);
      } catch (error) {
        console.error("Error searching entries:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [entries]
  );

  // Call search whenever parameters change
  useEffect(() => {
    debouncedSearch(searchParams);
  }, [searchParams, debouncedSearch]);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams({
      query: "",
      startDate: "",
      endDate: "",
      mood: "",
    });
  };

  // Get mood emoji
  const getMoodEmoji = (mood: string = "neutral") => {
    const moods: Record<string, string> = {
      happy: "😊",
      neutral: "😐",
      sad: "😔",
      excited: "🤩",
      tired: "😴",
    };
    return moods[mood] || "😐";
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

  // View entry details
  const handleEntryClick = (id: number | undefined) => {
    if (typeof id === "number") {
      navigate(`/diary/view?id=${id}`);
    }
  };

  // Get a cleaner preview of the content
  const getPreviewText = (content: string, maxLength: number = 100) => {
    if (!content) return "";

    // Remove extra whitespace and new lines for cleaner preview
    const cleaned = content.replace(/\s+/g, " ").trim();

    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + "...";
  };

  return (
    <div className="diary-search-container">
      <div className="diary-search-header">
        <h1>Diary Entries</h1>
        <button
          className="filters-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      <div className="diary-search-bar">
        <input
          type="text"
          name="query"
          value={searchParams.query}
          onChange={handleInputChange}
          placeholder="Search through your past entries..."
          className="diary-search-input"
          autoFocus
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className={`search-filters ${showFilters ? "expanded" : ""}`}>
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            name="startDate"
            value={searchParams.startDate}
            onChange={handleInputChange}
            className="date-input"
          />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            name="endDate"
            value={searchParams.endDate}
            onChange={handleInputChange}
            className="date-input"
          />
        </div>

        <div className="filter-group">
          <label>Mood</label>
          <select
            name="mood"
            value={searchParams.mood}
            onChange={handleInputChange}
            className="mood-select"
          >
            <option value="">Any mood</option>
            {moods.map((mood) => (
              <option key={mood} value={mood}>
                {mood} {getMoodEmoji(mood)}
              </option>
            ))}
          </select>
        </div>

        <button className="clear-filters-btn" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      <div className="past-records-container">
        <div className="past-records-header">
          <h2>
            Past Records{" "}
            <span className="record-count">({results.length})</span>
          </h2>
          {isSearching && (
            <div className="searching-indicator">Searching...</div>
          )}
        </div>

        {results.length > 0 ? (
          <div className="past-records-list">
            {results.map((entry) => (
              <div
                key={`entry-${entry.id}`}
                className="past-record-item"
                onClick={() => handleEntryClick(entry.id)}
              >
                <div className="record-header">
                  <span className="record-date">
                    {formatDateDisplay(entry.date)}
                  </span>
                  <span className="record-title-divider">-</span>
                  <span className="record-title">{entry.title}</span>
                  <span className="record-mood">
                    {getMoodEmoji(entry.mood)}
                  </span>
                </div>
                <p className="record-preview">
                  {getPreviewText(entry.content, 160)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-records">
            <div className="no-records-icon">📝</div>
            <p>No matching entries found.</p>
            <button
              className="write-entry-btn"
              onClick={() => navigate("/diary/write")}
            >
              Write a New Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiarySearch;
