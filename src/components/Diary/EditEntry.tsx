import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DiaryEntry from "./DiaryEntry";
import { useDiary } from "../../context/DiaryContext";
import "./DiaryEntry.css";

/**
 * EditEntry Component
 */
const EditEntry: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getEntryById, updateEntry } = useDiary();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads diary entry by ID from URL parameters
   */
  useEffect(() => {
    const loadEntry = async () => {
      try {
        const query = new URLSearchParams(location.search);
        const id = query.get("id");

        if (!id) {
          setError("No entry ID provided, boss");
          setLoading(false);
          return;
        }

        const entryData = await getEntryById(Number(id));
        if (!entryData) {
          setError("Entry not found, boss");
          setLoading(false);
          return;
        }

        setEntry(entryData);
        console.log("Wingman: Entry loaded for editing:", entryData.title);
      } catch (err) {
        console.error("Wingman: Error loading diary entry:", err);
        setError("Failed to load entry, boss");
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [location.search, getEntryById]);

  /**
   * Handles entry updates with original date preservation
   */
  const handleSave = async (updatedData: {
    title: string;
    content: string;
    mood: string;
  }) => {
    try {
      if (!entry?.id) {
        throw new Error("Entry ID missing, boss");
      }

      await updateEntry(entry.id, {
        title: updatedData.title,
        content: updatedData.content,
        mood: updatedData.mood,
        date: entry.date,
      });

      console.log("Wingman: Entry updated successfully:", entry.id);

      navigate("/diary/view", {
        state: { message: "Entry updated successfully, boss" },
      });
    } catch (error) {
      console.error("Wingman: Error updating diary entry:", error);
      alert(
        "Could not update diary entry, boss. Please check your input and try again.",
      );
    }
  };

  if (loading) {
    return (
      <div className="diary-loading">
        <div className="loading-spinner"></div>
        <p>Your Wingman is retrieving your thoughts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diary-error">
        <div className="error-icon">⚠️</div>
        <h2>Error Loading Entry</h2>
        <p>{error}</p>
        <button
          className="diary-action-btn"
          onClick={() => navigate("/diary/view")}
        >
          Return to Entries
        </button>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="diary-error">
        <div className="error-icon">📝</div>
        <p>Entry not found, boss</p>
        <button
          className="diary-action-btn"
          onClick={() => navigate("/diary/view")}
        >
          Browse Your Entries
        </button>
      </div>
    );
  }

  return (
    <DiaryEntry
      initialTitle={entry.title}
      initialContent={entry.content}
      initialMood={entry.mood || "neutral"}
      onSave={handleSave}
      isEditing={true}
    />
  );
};

export default EditEntry;
