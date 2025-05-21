import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DiaryEntry from "./DiaryEntry";
import { useDiary } from "../../context/DiaryContext";
import "./Diary.css";

const EditEntry: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getEntryById, updateEntry } = useDiary();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntry = async () => {
      try {
        const query = new URLSearchParams(location.search);
        const id = query.get("id");
        
        if (!id) {
          setError("No entry ID provided");
          setLoading(false);
          return;
        }
        
        const entryData = await getEntryById(Number(id));
        setEntry(entryData);
      } catch (err) {
        console.error("Error loading diary entry:", err);
        setError("Failed to load entry");
      } finally {
        setLoading(false);
      }
    };
    
    loadEntry();
  }, [location.search]);

  const handleSave = async (updatedData: {
    title: string;
    content: string;
    mood: string;
  }) => {
    try {
      if (!entry?.id) {
        throw new Error("Entry ID missing");
      }
      
      await updateEntry(entry.id, {
        title: updatedData.title,
        content: updatedData.content,
        mood: updatedData.mood,
      });
      
      navigate("/diary/view", {
        state: { message: "Entry updated successfully" },
      });
    } catch (error) {
      console.error("Error updating diary entry:", error);
      throw error;
    }
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