import React, { useState } from "react";
import "./Diary.css";
import { addDiaryEntry } from "../../api/Diary";

const WriteEntry: React.FC = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("neutral");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update the handleSubmit function to store in Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Send to Supabase via API
      const result = await addDiaryEntry({
        date: today,
        title,
        content,
        mood,
      });

      console.log("Diary entry saved to Supabase:", result);

      setTitle("");
      setContent("");
      setMood("neutral");
      alert("Entry saved to your journal!");
    } catch (err) {
      console.error("Error saving diary entry:", err);
      setError("Failed to save entry. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="diary-card">
      <h2>Write New Entry</h2>
      <form onSubmit={handleSubmit} className="diary-form">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <select value={mood} onChange={(e) => setMood(e.target.value)}>
          <option value="happy">😊 Happy</option>
          <option value="neutral">😐 Neutral</option>
          <option value="sad">😔 Sad</option>
          <option value="excited">🤩 Excited</option>
          <option value="tired">😴 Tired</option>
        </select>
        <button type="submit" className="action-btn" disabled={saving}>
          {saving ? "Saving..." : "Save Entry"}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
};

export default WriteEntry;
