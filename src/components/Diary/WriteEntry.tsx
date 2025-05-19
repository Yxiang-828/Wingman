import React, { useState } from "react";
import "./Diary.css";

const WriteEntry: React.FC = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("neutral");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add logic to save entry
    alert("Entry saved!");
    setTitle("");
    setContent("");
    setMood("neutral");
  };

  return (
    <div className="diary-card">
      <h2>Write New Entry</h2>
      <form onSubmit={handleSubmit} className="diary-form">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={e => setContent(e.target.value)}
          required
        />
        <select value={mood} onChange={e => setMood(e.target.value)}>
          <option value="happy">😊 Happy</option>
          <option value="neutral">😐 Neutral</option>
          <option value="sad">😔 Sad</option>
          <option value="excited">🤩 Excited</option>
          <option value="tired">😴 Tired</option>
        </select>
        <button type="submit" className="action-btn">Save Entry</button>
      </form>
    </div>
  );
};

export default WriteEntry;