import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDiary } from "../../context/DiaryContext";
import { format } from "date-fns";
import DiaryDetailPopup from "../Diary/DiaryDetailPopup";
import "./Dashboard.css";
import "./DiaryCard.css";

interface DiaryCardProps {
  entries?: any[]; // Optional prop entries
}

const DiaryCard: React.FC<DiaryCardProps> = ({ entries: propEntries }) => {
  const navigate = useNavigate();
  const {
    entries: contextEntries,
    loading,
    deleteEntry,
    refreshEntries,
  } = useDiary();
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const dashboardRef = useRef<HTMLElement | null>(null);
  const [displayEntries, setDisplayEntries] = useState<any[]>([]);

  // Set container for modal
  useEffect(() => {
    dashboardRef.current =
      document.querySelector(".dashboard") ||
      document.querySelector(".dashboard-container") ||
      document.getElementById("dashboard");
  }, []);

  // Sort helper
  const sortByCreatedAtDesc = (entryList: any[]) => {
    const validEntries = entryList.filter((e) => e.created_at); // Skip undefined dates
    const sorted = [...validEntries].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
    return sorted;
  };

  // Handle sorting + logging
  useEffect(() => {
    console.log("DiaryCard useEffect triggered");
    console.log("propEntries:", propEntries);
    console.log("context entries:", contextEntries);
    console.log("🔎 Checking for May 30 entries...");
    contextEntries.forEach((entry) => {
      const d = new Date(entry.created_at);
      if (d.toISOString().startsWith("2025-05-30")) {
        console.log(
          `🎯 Found May 30 entry: ID ${entry.id}, title: ${entry.title}, created_at: ${entry.created_at}`
        );
      }
    });

    // const sourceEntries =
    //   propEntries && propEntries.length > 0 ? propEntries : contextEntries;
    const hasValidPropEntries = propEntries?.some((e) => e.created_at);
    const sourceEntries =
      propEntries && propEntries.length > 0
        ? [
            ...propEntries,
            ...contextEntries.filter(
              (e) => !propEntries.some((p) => p.id === e.id)
            ),
          ]
        : contextEntries;
    const selectedDate = new Date("2025-05-30"); // Hardcoded for testing — replace with your actual selectedDate

    console.log("📅 selectedDate:", selectedDate?.toISOString().slice(0, 10));
    console.log("🔍 Filtering entries...");
    sourceEntries.forEach((entry) => {
      const createdDate = new Date(entry.created_at);
      const match =
        createdDate.toISOString().slice(0, 10) ===
        selectedDate?.toISOString().slice(0, 10);
      console.log(
        `📝 ID ${entry.id}: created=${createdDate
          .toISOString()
          .slice(0, 10)}, match=${match}`
      );
    });

    console.log("🚨 Raw created_at values:");
    sourceEntries.forEach((e) => {
      console.log(`ID ${e.id} | created_at: ${e.created_at}`);
    });

    const sorted = sortByCreatedAtDesc(sourceEntries);

    console.log("✅ Sorted by created_at:");
    sorted.forEach((e) => {
      console.log(`ID ${e.id} | created_at: ${e.created_at}`);
    });

    setDisplayEntries(sorted.slice(0, 3)); // Only show top 3
  }, [propEntries, contextEntries]);

  // Refresh entries on mount
  useEffect(() => {
    refreshEntries();
  }, []);

  const handleEntryClick = (entry: any) => setSelectedEntry(entry);
  const handleDelete = (id: number) => {
    deleteEntry(id);
    setSelectedEntry(null);
  };
  const handleEdit = (id: number) => navigate(`/diary/edit?id=${id}`);

  const formatDateDisplay = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const truncateTextDisplay = (text: string, maxLength = 40) =>
    text?.length > maxLength ? text.slice(0, maxLength) + "..." : text;

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case "happy":
        return "😊";
      case "sad":
        return "😢";
      case "excited":
        return "😃";
      case "angry":
        return "😡";
      case "relaxed":
        return "😌";
      default:
        return "😐";
    }
  };

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
        <div className="card-loading">Loading entries...</div>
      ) : displayEntries && displayEntries.length > 0 ? (
        <ul className="entries-list">
          {displayEntries.map((entry) => (
            <li
              key={entry.id}
              className="entry-item"
              onClick={() => handleEntryClick(entry)}
            >
              <div className="entry-header">
                <h3>{entry.title}</h3>
                <div className="entry-date">
                  <span className="entry-mood">{getMoodEmoji(entry.mood)}</span>
                  {formatDateDisplay(
                    entry.created_at || entry.entry_date || entry.date
                  )}
                </div>
              </div>
              <div className="entry-preview">
                {truncateTextDisplay(entry.content)}
              </div>
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

      {selectedEntry && (
        <DiaryDetailPopup
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          container={dashboardRef.current || undefined}
        />
      )}
    </div>
  );
};

export default DiaryCard;
