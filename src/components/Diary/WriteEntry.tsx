import React from "react";
import { useNavigate } from "react-router-dom";
import DiaryEntry from "./DiaryEntry";
import { addDiaryEntry } from "../../api/Diary";
import { useDiary } from "../../context/DiaryContext";
import "./Diary.css";

const WriteEntry: React.FC = () => {
  const navigate = useNavigate();
  const { refreshEntries } = useDiary();

  const handleSave = async (entry: {
    title: string;
    content: string;
    mood: string;
  }) => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Send to Supabase via API
      await addDiaryEntry({
        date: today,
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
      });

      // Refresh diary entries and navigate to view
      await refreshEntries();
      navigate("/diary/view", {
        state: { message: "Entry saved successfully" },
      });
    } catch (error) {
      console.error("Error saving diary entry:", error);
      throw error;
    }
  };

  return <DiaryEntry onSave={handleSave} />;
};

export default WriteEntry;
