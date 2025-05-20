import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import "./Dashboard.css";

const DiaryCard: React.FC = () => {
  const navigate = useNavigate();
  const { entries, loading } = useDiary();
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && entries.length > 0) {
      // Sort by date, newest first, and take the first 2
      const sorted = [...entries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);

      // Format for display
      const formatted = sorted.map((entry) => ({
        id: entry.id,
        title: entry.title,
        preview:
          entry.content.length > 100
            ? entry.content.substring(0, 100) + "..."
            : entry.content,
        date: new Date(entry.date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }));

      setRecentEntries(formatted);
    }
  }, [entries, loading]);

  return (
    <div className="dashboard-card diary-card">
      <div className="dashboard-card-header">
        <h2>Recent Diary</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/diary/view")}
        >
          View All
        </button>
      </div>
      {loading ? (
        <div className="loading-indicator">Loading entries...</div>
      ) : recentEntries.length > 0 ? (
        <ul className="entries-list">
          {recentEntries.map((entry) => (
            <li key={entry.id} className="entry-item">
              <div className="entry-header">
                <h3>{entry.title}</h3>
                <span className="entry-date">{entry.date}</span>
              </div>
              <p className="entry-preview">{entry.preview}</p>
              <button 
                className="entry-read-more"
                onClick={() => navigate(`/diary/view?id=${entry.id}`)}
              >
                Read more
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <p>No diary entries yet</p>
          <button
            className="action-btn small"
            onClick={() => navigate("/diary/write")}
          >
            Write First Entry
          </button>
        </div>
      )}
    </div>
  );
};

export default DiaryCard;
