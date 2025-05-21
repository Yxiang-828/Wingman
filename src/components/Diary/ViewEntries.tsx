import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { formatDate } from "../../utils/dateUtils";
import DiaryDetailPopup from "./DiaryDetailPopup"; // Import the popup component
import "./Diary.css";
import "./ViewEntries.css";

const ViewEntries: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { entries, loading, refreshEntries, deleteEntry } = useDiary();
  const [groupedEntries, setGroupedEntries] = useState<Record<string, any[]>>({});
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null); // Track selected entry for popup

  // Group entries by month for better organization
  useEffect(() => {
    if (!loading && entries.length > 0) {
      const grouped: Record<string, any[]> = {};
      
      entries.forEach(entry => {
        const date = new Date(entry.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
        
        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            name: monthName,
            entries: []
          };
        }
        
        grouped[monthKey].entries.push(entry);
      });
      
      // Sort entries in each month by date (newest first)
      Object.keys(grouped).forEach(key => {
        grouped[key].entries.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });
      
      // Set the most recent month as expanded by default
      const sortedMonths = Object.keys(grouped).sort().reverse();
      if (sortedMonths.length > 0 && !expandedMonth) {
        setExpandedMonth(sortedMonths[0]);
      }
      
      setGroupedEntries(grouped);
    }
  }, [entries, loading]);

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

  // Toggle month expansion
  const toggleMonth = (monthKey: string) => {
    setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  // Format date for display
  const formatEntryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      weekday: 'short',
      day: 'numeric'
    });
  };

  // View entry details - opens popup instead of navigating
  const viewEntry = (entry: any) => {
    setSelectedEntry(entry);
  };
  
  // Navigate to edit page
  const handleEditEntry = (id: number) => {
    navigate(`/diary/edit?id=${id}`); // Make sure we use the correct path
  };
  
  // Handle delete entry
  const handleDeleteEntry = async (id: number) => {
    try {
      await deleteEntry(id);
      await refreshEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  return (
    <div className="diary-card view-entries-container">
      <div className="view-entries-header">
        <h2>Your Diary Entries</h2>
        <div className="view-entries-actions">
          <button 
            className="search-entries-btn"
            onClick={() => navigate("/diary/search")}
          >
            🔍 Search
          </button>
          <button 
            className="write-entry-btn" 
            onClick={() => navigate("/diary/write")}
          >
            ✏️ New Entry
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="diary-loading">Loading entries...</div>
      ) : entries.length > 0 ? (
        <div className="entries-by-month">
          {Object.keys(groupedEntries)
            .sort((a, b) => b.localeCompare(a)) // Sort months in descending order
            .map(monthKey => {
              const monthData = groupedEntries[monthKey];
              const isExpanded = expandedMonth === monthKey;
              
              return (
                <div key={monthKey} className="month-group">
                  <div 
                    className={`month-header ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleMonth(monthKey)}
                  >
                    <h3>{monthData.name}</h3>
                    <span className="entry-count">
                      {monthData.entries.length} {monthData.entries.length === 1 ? 'entry' : 'entries'}
                    </span>
                    <span className="expand-indicator">{isExpanded ? '▼' : '►'}</span>
                  </div>
                  
                  <div className={`month-entries ${isExpanded ? 'expanded' : ''}`}>
                    {monthData.entries.map(entry => (
                      <div 
                        key={entry.id} 
                        className="diary-entry-preview"
                        onClick={() => viewEntry(entry)}
                      >
                        <div className="entry-preview-header">
                          <div className="entry-preview-date-mood">
                            <span className="entry-preview-date">
                              {formatEntryDate(entry.date)}
                            </span>
                            <span className="entry-preview-mood">
                              {getMoodEmoji(entry.mood || 'neutral')}
                            </span>
                          </div>
                          <h4 className="entry-preview-title">{entry.title}</h4>
                        </div>
                        
                        <p className="entry-preview-content">
                          {entry.content.length > 120
                            ? `${entry.content.substring(0, 120)}...`
                            : entry.content}
                        </p>
                        
                        <div className="entry-preview-footer">
                          <span className="read-more">Read more</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
          })}
        </div>
      ) : (
        <div className="diary-empty-state">
          <div className="empty-icon">📝</div>
          <p>No entries found. Start your journaling journey today!</p>
          <button
            className="action-btn"
            onClick={() => navigate("/diary/write")}
          >
            Write First Entry
          </button>
        </div>
      )}
      
      {/* Success message when coming from writing/saving a new entry */}
      {location.state?.message && (
        <div className="success-message">
          <span>{location.state.message}</span>
          <button 
            className="close-btn"
            onClick={() => navigate(location.pathname, { replace: true })}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Diary entry popup */}
      {selectedEntry && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
        />
      )}
    </div>
  );
};

export default ViewEntries;
