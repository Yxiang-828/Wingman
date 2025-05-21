import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useParams } from "react-router-dom";
import "./Diary.css";
import { fetchDiaryEntries, updateDiaryEntry, deleteDiaryEntry } from "../../api/Diary";
import type { DiaryEntry, MoodScale } from "../../types/database";
import { formatDate } from "../../utils/dateUtils";
import MoodSelector from "../Common/MoodSelector";

const ViewEntry: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState<MoodScale>("neutral");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntry = async () => {
      setLoading(true);
      try {
        // Get entry ID from query parameter
        const query = new URLSearchParams(location.search);
        const entryId = query.get("id");

        if (!entryId) {
          // No ID specified, show all entries
          navigate("/diary");
          return;
        }

        // Fetch all entries and find the specific one
        const entries = await fetchDiaryEntries();
        const foundEntry = entries.find(e => e.id === parseInt(entryId));

        if (foundEntry) {
          setEntry(foundEntry);
          // Initialize edit state
          setEditTitle(foundEntry.title);
          setEditContent(foundEntry.content);
          setEditMood(foundEntry.mood as MoodScale);
        } else {
          setError("Entry not found");
        }
      } catch (error) {
        console.error("Error fetching diary entry:", error);
        setError("Failed to load entry");
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [location.search, navigate]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (entry) {
      setEditTitle(entry.title);
      setEditContent(entry.content);
      setEditMood(entry.mood as MoodScale);
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!entry) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const updatedEntry = await updateDiaryEntry({
        id: entry.id,
        title: editTitle,
        content: editContent,
        mood: editMood
      });
      
      setEntry(updatedEntry);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating entry:", err);
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    try {
      await deleteDiaryEntry(entry.id);
      navigate("/diary", { state: { message: "Entry deleted successfully" } });
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError("Failed to delete entry");
      setConfirmDelete(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(false);
  };

  const getMoodEmoji = (mood: MoodScale) => {
    const moods: Record<MoodScale, string> = {
      happy: "😊",
      neutral: "😐",
      sad: "😔",
      excited: "🤩",
      tired: "😴",
    };
    return moods[mood] || "😐";
  };

  if (loading) {
    return <div className="diary-loading">Loading entry...</div>;
  }

  if (error) {
    return <div className="diary-error">{error}</div>;
  }

  if (!entry) {
    return <div className="diary-error">Entry not found</div>;
  }

  return (
    <div className="diary-container">
      <div className="diary-nav">
        <button className="diary-back-btn" onClick={() => navigate("/diary")}>
          ← Back to All Entries
        </button>
      </div>

      <div className="diary-card view-entry">
        {isEditing ? (
          // Edit Mode
          <>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="edit-entry-title"
              placeholder="Entry Title"
            />
            
            <div className="edit-mood-row">
              <span className="edit-label">Mood:</span>
              <MoodSelector 
                selectedMood={editMood}
                onChange={setEditMood}
              />
            </div>
            
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="edit-entry-content"
              placeholder="Write your thoughts..."
              rows={12}
            />
            
            <div className="entry-action-row">
              <button 
                onClick={handleCancelEdit} 
                className="entry-btn secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit} 
                className="entry-btn primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
            {error && <div className="entry-error">{error}</div>}
          </>
        ) : (
          // View Mode
          <>
            <div className="entry-header">
              <h1 className="entry-title">{entry.title}</h1>
              <div className="entry-meta">
                <span className="entry-date">{formatDate(entry.entry_date)}</span>
                <div className="entry-mood">
                  <span className="mood-emoji">{getMoodEmoji(entry.mood as MoodScale)}</span>
                </div>
              </div>
            </div>
            
            <div className="entry-content">
              {entry.content.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
            
            <div className="entry-action-row">
              {confirmDelete ? (
                <>
                  <p className="delete-confirm-text">Are you sure you want to delete this entry?</p>
                  <button onClick={handleCancelDelete} className="entry-btn secondary">
                    Cancel
                  </button>
                  <button onClick={handleDelete} className="entry-btn danger">
                    Yes, Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleDelete} className="entry-btn danger">
                    Delete
                  </button>
                  <button onClick={handleEdit} className="entry-btn primary">
                    Edit
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewEntry;