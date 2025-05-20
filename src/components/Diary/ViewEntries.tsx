import React, { useEffect, useState } from "react";
import "./Diary.css";
import { fetchDiaryEntries } from "../../api/Diary";
import type { DiaryEntry } from "../../api/Diary";

const ViewEntries: React.FC = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      try {
        // Get entries from the last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const todayStr = today.toISOString().slice(0, 10);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

        console.log(
          `Fetching diary entries from ${thirtyDaysAgoStr} to ${todayStr}`
        );

        // This will need a new API endpoint that supports date ranges
        // For now, we'll just use the today endpoint as a placeholder
        const data = await fetchDiaryEntries(todayStr);

        setEntries(data);
      } catch (error) {
        console.error("Error fetching diary entries:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="diary-card">
      <h2>View Entries</h2>
      {loading ? (
        <div className="diary-loading">Loading entries...</div>
      ) : entries.length > 0 ? (
        <ul className="diary-entries-list">
          {entries.map((entry) => (
            <li key={entry.id} className="diary-entry">
              <div className="diary-mood">
                {getMoodEmoji(entry.mood || "neutral")}
              </div>
              <h3>{entry.title}</h3>
              <span className="diary-date">{formatDate(entry.date)}</span>
              <div className="diary-content">{entry.content}</div>
              <div className="diary-actions">
                <button className="diary-action-btn" title="Edit entry">
                  ✏️
                </button>
                <button className="diary-action-btn" title="Delete entry">
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="diary-empty-state">
          <div className="empty-icon">📝</div>
          <p>No entries found. Start your journaling journey today!</p>
          <button
            className="action-btn"
            onClick={() => (window.location.href = "/diary/write")}
          >
            Write First Entry
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewEntries;
