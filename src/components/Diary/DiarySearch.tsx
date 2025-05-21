import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiary } from '../../context/DiaryContext';
import { debounce } from '../../utils/helpers';
import { formatDate } from '../../utils/dateUtils';
import './DiarySearch.css';

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
    query: '',
    startDate: '',
    endDate: '',
    mood: ''
  });
  const [results, setResults] = useState(entries);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null);
  
  // Available moods for filtering
  const moods = ["happy", "sad", "neutral", "excited", "tired"];
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((params: SearchParams) => {
      setIsSearching(true);
      
      try {
        // Filter entries based on search parameters
        const filtered = entries.filter(entry => {
          // Text search in title and content
          const textMatch = !params.query || 
            entry.title.toLowerCase().includes(params.query.toLowerCase()) ||
            entry.content.toLowerCase().includes(params.query.toLowerCase());
          
          // Date range filtering
          const dateMatch = (!params.startDate || entry.date >= params.startDate) && 
                           (!params.endDate || entry.date <= params.endDate);
          
          // Mood filtering
          const moodMatch = !params.mood || entry.mood === params.mood;
          
          return textMatch && dateMatch && moodMatch;
        });
        
        setResults(filtered);
      } catch (error) {
        console.error('Error searching entries:', error);
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchParams({
      query: '',
      startDate: '',
      endDate: '',
      mood: ''
    });
  };
  
  // Get mood emoji
  const getMoodEmoji = (mood: string) => {
    const moods: Record<string, string> = {
      happy: "😊",
      neutral: "😐",
      sad: "😔",
      excited: "🤩",
      tired: "😴",
    };
    return moods[mood] || "😐";
  };
  
  // View entry details
  const handleEntryClick = (id: number) => {
    navigate(`/diary/view?id=${id}`);
  };
  
  return (
    <div className="diary-search-container">
      <div className="diary-search-header">
        <h1>Search Diary Entries</h1>
        <button 
          className="filters-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      
      <div className="diary-search-bar">
        <input
          type="text"
          name="query"
          value={searchParams.query}
          onChange={handleInputChange}
          placeholder="Search in titles and entries..."
          className="diary-search-input"
          autoFocus
        />
        <span className="search-icon">🔍</span>
      </div>
      
      <div className={`search-filters ${showFilters ? 'expanded' : ''}`}>
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
            {moods.map(mood => (
              <option key={mood} value={mood}>
                {getMoodEmoji(mood)} {mood}
              </option>
            ))}
          </select>
        </div>
        
        <button className="clear-filters-btn" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>
      
      <div className="search-results-container">
        <div className="search-results-header">
          <h2>Results <span className="result-count">{results.length}</span></h2>
          {isSearching && <div className="searching-indicator">Searching...</div>}
        </div>
        
        {results.length > 0 ? (
          <div className="search-results-list">
            {results.map(entry => (
              <div 
                key={entry.id} 
                className="search-result-item" 
                onClick={() => handleEntryClick(entry.id)}
              >
                <div className="result-header">
                  <h3 className="result-title">{entry.title}</h3>
                  <div className="result-mood">{getMoodEmoji(entry.mood || 'neutral')}</div>
                </div>
                
                <div className="result-date">{formatDate(entry.date)}</div>
                
                <p className="result-preview">
                  {entry.content.length > 150 
                    ? `${entry.content.substring(0, 150)}...` 
                    : entry.content}
                </p>
                
                <div className="result-action">View Entry →</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <div className="no-results-icon">📝</div>
            <p>No entries match your search</p>
            {searchParams.query || searchParams.startDate || searchParams.endDate || searchParams.mood ? (
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            ) : (
              <button 
                className="write-entry-btn"
                onClick={() => navigate('/diary/write')}
              >
                Write Your First Entry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiarySearch;